BEGIN;

-- Keep one print per (company, prescription, period), but refresh its snapshot
-- when printing again after prescription changes.
CREATE OR REPLACE FUNCTION public.create_prescription_print_snapshot(
  p_prescription_id uuid,
  p_period_start date,
  p_period_end date,
  p_week_start_day smallint,
  p_patient_snapshot jsonb,
  p_notes_snapshot text,
  p_metadata_snapshot jsonb DEFAULT '{}'::jsonb,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  prescription_print_id uuid,
  print_number text,
  period_start date,
  period_end date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;

  v_counter_year integer;
  v_period_start date;
  v_period_end date;
  v_period_days integer;
  v_seq integer;
  v_print_number text;
  v_print_id uuid;

  v_existing_print_id uuid;
  v_existing_print_number text;
  v_reused_print boolean := false;

  v_item jsonb;
  v_item_position bigint;
  v_order_index integer;
  v_source_item_id uuid;
  v_has_print_permission boolean;
  v_grid jsonb;
  v_content_version smallint := 1;
  v_payload_hash text;
  v_payload_content_id uuid;
  v_description_snapshot text;
  v_route_snapshot text;
  v_frequency_snapshot text;
  v_item_hash text;
  v_item_content_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_prescription_id IS NULL THEN
    RAISE EXCEPTION 'prescription_id obrigatorio';
  END IF;

  IF p_period_start IS NULL THEN
    RAISE EXCEPTION 'period_start obrigatorio';
  END IF;

  IF p_period_end IS NULL THEN
    RAISE EXCEPTION 'period_end obrigatorio';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end deve ser maior ou igual a period_start';
  END IF;

  IF p_week_start_day IS NULL OR p_week_start_day < 0 OR p_week_start_day > 6 THEN
    RAISE EXCEPTION 'week_start_day invalido. Esperado valor entre 0 e 6';
  END IF;

  v_period_start := p_period_start;
  v_period_end := p_period_end;
  v_period_days := (v_period_end - v_period_start + 1);

  IF v_period_days < 1 OR v_period_days > 14 THEN
    RAISE EXCEPTION 'periodo invalido. A duracao deve estar entre 1 e 14 dias';
  END IF;

  SELECT au.company_id
    INTO v_company_id
  FROM public.app_user au
  WHERE au.auth_user_id = v_user_id
    AND au.is_active = TRUE
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sem empresa vinculada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prescription p
    WHERE p.id = p_prescription_id
      AND p.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Prescricao nao encontrada para a empresa do usuario';
  END IF;

  v_has_print_permission :=
    public.has_permission(v_user_id, 'prescriptions', 'print')
    OR public.has_permission(v_user_id, 'prescriptions', 'edit')
    OR public.has_permission(v_user_id, 'prescriptions', 'create')
    OR public.has_permission(v_user_id, 'prescriptions', 'approve');

  IF NOT v_has_print_permission THEN
    RAISE EXCEPTION 'Usuario sem permissao para imprimir prescricao';
  END IF;

  SELECT pp.id, pp.print_number
    INTO v_existing_print_id, v_existing_print_number
  FROM public.prescription_print pp
  WHERE pp.company_id = v_company_id
    AND pp.prescription_id = p_prescription_id
    AND pp.period_start = v_period_start
    AND pp.period_end = v_period_end
  LIMIT 1;

  IF v_existing_print_id IS NOT NULL THEN
    v_print_id := v_existing_print_id;
    v_print_number := v_existing_print_number;
    v_reused_print := true;
  END IF;

  v_payload_hash := public.hash_print_payload_v1(
    COALESCE(p_patient_snapshot, '{}'::jsonb),
    p_notes_snapshot,
    COALESCE(p_metadata_snapshot, '{}'::jsonb)
  );

  v_payload_content_id := NULL;
  INSERT INTO public.prescription_print_payload_content (
    company_id,
    content_version,
    content_hash,
    patient_snapshot,
    notes_snapshot,
    metadata_snapshot
  )
  VALUES (
    v_company_id,
    v_content_version,
    v_payload_hash,
    COALESCE(p_patient_snapshot, '{}'::jsonb),
    p_notes_snapshot,
    COALESCE(p_metadata_snapshot, '{}'::jsonb)
  )
  ON CONFLICT (company_id, content_version, content_hash)
  DO NOTHING
  RETURNING id INTO v_payload_content_id;

  IF v_payload_content_id IS NULL THEN
    SELECT ppc.id
      INTO v_payload_content_id
    FROM public.prescription_print_payload_content ppc
    WHERE ppc.company_id = v_company_id
      AND ppc.content_version = v_content_version
      AND ppc.content_hash = v_payload_hash
    LIMIT 1;
  END IF;

  IF v_payload_content_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao resolver payload_content_id';
  END IF;

  IF NOT v_reused_print THEN
    v_counter_year := EXTRACT(YEAR FROM v_period_start);

    BEGIN
      INSERT INTO public.prescription_print_counter (
        company_id,
        counter_year,
        last_value
      )
      VALUES (v_company_id, v_counter_year, 1)
      ON CONFLICT (company_id, counter_year)
      DO UPDATE SET
        last_value = prescription_print_counter.last_value + 1,
        updated_at = now()
      RETURNING last_value INTO v_seq;

      v_print_number := format('%s/%s', v_seq, v_counter_year);

      INSERT INTO public.prescription_print (
        company_id,
        prescription_id,
        print_year,
        print_seq,
        print_number,
        period_start,
        period_end,
        week_start_day,
        payload_content_id,
        patient_snapshot,
        notes_snapshot,
        metadata_snapshot,
        created_by
      ) VALUES (
        v_company_id,
        p_prescription_id,
        v_counter_year,
        v_seq,
        v_print_number,
        v_period_start,
        v_period_end,
        p_week_start_day,
        v_payload_content_id,
        COALESCE(p_patient_snapshot, '{}'::jsonb),
        p_notes_snapshot,
        COALESCE(p_metadata_snapshot, '{}'::jsonb),
        v_user_id
      )
      RETURNING id INTO v_print_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT pp.id, pp.print_number
          INTO v_print_id, v_print_number
        FROM public.prescription_print pp
        WHERE pp.company_id = v_company_id
          AND pp.prescription_id = p_prescription_id
          AND pp.period_start = v_period_start
          AND pp.period_end = v_period_end
        LIMIT 1;

        IF v_print_id IS NULL THEN
          RAISE EXCEPTION 'Falha ao resolver impressao existente apos conflito de unicidade';
        END IF;

        v_reused_print := true;
    END;
  END IF;

  IF v_print_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao resolver impressao da prescricao';
  END IF;

  IF v_reused_print THEN
    UPDATE public.prescription_print pp
       SET week_start_day = p_week_start_day,
           payload_content_id = v_payload_content_id,
           patient_snapshot = COALESCE(p_patient_snapshot, '{}'::jsonb),
           notes_snapshot = p_notes_snapshot,
           metadata_snapshot = COALESCE(p_metadata_snapshot, '{}'::jsonb)
     WHERE pp.id = v_print_id
       AND pp.company_id = v_company_id
       AND pp.prescription_id = p_prescription_id
       AND pp.period_start = v_period_start
       AND pp.period_end = v_period_end;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Falha ao atualizar impressao existente';
    END IF;
  END IF;

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'items deve ser um array JSON';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT COALESCE(NULLIF(elem.value->>'order_index', '')::integer, elem.ordinality::integer) AS order_index
      FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ordinality)
    ) resolved
    GROUP BY resolved.order_index
    HAVING resolved.order_index IS NULL
       OR resolved.order_index <= 0
       OR COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'items contem order_index invalido ou duplicado para o mesmo snapshot';
  END IF;

  DELETE FROM public.prescription_print_item ppi
  WHERE ppi.company_id = v_company_id
    AND ppi.prescription_print_id = v_print_id;

  FOR v_item, v_item_position IN
    SELECT elem.value, elem.ordinality
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ordinality)
  LOOP
    v_order_index := COALESCE(NULLIF(v_item->>'order_index', '')::integer, v_item_position::integer);
    IF v_order_index IS NULL OR v_order_index <= 0 THEN
      RAISE EXCEPTION 'order_index invalido. Esperado > 0';
    END IF;

    v_source_item_id := NULLIF(v_item->>'source_prescription_item_id', '')::uuid;

    IF v_source_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.prescription_item pi
      WHERE pi.id = v_source_item_id
        AND pi.prescription_id = p_prescription_id
        AND pi.company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Item de origem nao pertence a prescricao informada: %', v_source_item_id;
    END IF;

    v_grid := COALESCE(v_item->'grid_snapshot', '[]'::jsonb);

    IF jsonb_typeof(v_grid) <> 'array' THEN
      RAISE EXCEPTION 'grid_snapshot invalido. Esperado array JSON';
    END IF;

    IF jsonb_array_length(v_grid) <> v_period_days THEN
      RAISE EXCEPTION 'grid_snapshot invalido. Esperado array com % posicoes para o periodo informado', v_period_days;
    END IF;

    v_description_snapshot := COALESCE(NULLIF(v_item->>'description_snapshot', ''), 'Item sem descricao');
    v_route_snapshot := NULLIF(v_item->>'route_snapshot', '');
    v_frequency_snapshot := NULLIF(v_item->>'frequency_snapshot', '');

    v_item_hash := public.hash_print_item_v1(
      v_description_snapshot,
      v_route_snapshot,
      v_frequency_snapshot,
      v_grid
    );

    v_item_content_id := NULL;
    INSERT INTO public.prescription_print_item_content (
      company_id,
      content_version,
      content_hash,
      description_snapshot,
      route_snapshot,
      frequency_snapshot,
      grid_snapshot
    )
    VALUES (
      v_company_id,
      v_content_version,
      v_item_hash,
      v_description_snapshot,
      v_route_snapshot,
      v_frequency_snapshot,
      v_grid
    )
    ON CONFLICT (company_id, content_version, content_hash)
    DO NOTHING
    RETURNING id INTO v_item_content_id;

    IF v_item_content_id IS NULL THEN
      SELECT pic.id
        INTO v_item_content_id
      FROM public.prescription_print_item_content pic
      WHERE pic.company_id = v_company_id
        AND pic.content_version = v_content_version
        AND pic.content_hash = v_item_hash
      LIMIT 1;
    END IF;

    IF v_item_content_id IS NULL THEN
      RAISE EXCEPTION 'Falha ao resolver item_content_id';
    END IF;

    INSERT INTO public.prescription_print_item (
      company_id,
      prescription_print_id,
      source_prescription_item_id,
      order_index,
      item_content_id,
      description_snapshot,
      route_snapshot,
      frequency_snapshot,
      grid_snapshot
    ) VALUES (
      v_company_id,
      v_print_id,
      v_source_item_id,
      v_order_index,
      v_item_content_id,
      v_description_snapshot,
      v_route_snapshot,
      v_frequency_snapshot,
      v_grid
    );
  END LOOP;

  RETURN QUERY
  SELECT v_print_id, v_print_number, v_period_start, v_period_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_prescription_print_snapshot(uuid, date, date, smallint, jsonb, text, jsonb, jsonb) TO authenticated;

COMMIT;
