DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  END IF;
END $$;

BEGIN;

-- =====================================================
-- Helper hash functions (v1)
-- Hash is generated in Postgres only.
-- No jsonb_pretty: use jsonb_strip_nulls + deterministic jsonb_build_object.
-- =====================================================

CREATE OR REPLACE FUNCTION public.hash_print_payload_v1(
  p_patient_snapshot jsonb,
  p_notes_snapshot text,
  p_metadata_snapshot jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      convert_to(
        'v1|' || jsonb_strip_nulls(
          jsonb_build_object(
            'patient_snapshot', jsonb_strip_nulls(COALESCE(p_patient_snapshot, '{}'::jsonb)),
            'notes_snapshot', to_jsonb(COALESCE(p_notes_snapshot, '')),
            'metadata_snapshot', jsonb_strip_nulls(COALESCE(p_metadata_snapshot, '{}'::jsonb))
          )
        )::text,
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.hash_print_item_v1(
  p_description_snapshot text,
  p_route_snapshot text,
  p_frequency_snapshot text,
  p_grid_snapshot jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      convert_to(
        'v1|' || jsonb_strip_nulls(
          jsonb_build_object(
            'description_snapshot', COALESCE(p_description_snapshot, ''),
            'route_snapshot', COALESCE(p_route_snapshot, ''),
            'frequency_snapshot', COALESCE(p_frequency_snapshot, ''),
            'grid_snapshot', COALESCE(jsonb_strip_nulls(p_grid_snapshot), '[]'::jsonb)
          )
        )::text,
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

GRANT EXECUTE ON FUNCTION public.hash_print_payload_v1(jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_print_item_v1(text, text, text, jsonb) TO authenticated;

-- =====================================================
-- RPC: create snapshot (dual-write + dedup content)
-- Content tables are append-only: only INSERT/SELECT, no UPDATE/DELETE.
-- =====================================================

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
SET search_path = public
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

  IF v_period_days < 1 OR v_period_days > 7 THEN
    RAISE EXCEPTION 'periodo invalido. A duracao deve estar entre 1 e 7 dias';
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

  v_payload_hash := public.hash_print_payload_v1(
    COALESCE(p_patient_snapshot, '{}'::jsonb),
    p_notes_snapshot,
    COALESCE(p_metadata_snapshot, '{}'::jsonb)
  );

  v_payload_content_id := NULL;
  INSERT INTO public.print_payload_content (
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
    FROM public.print_payload_content ppc
    WHERE ppc.company_id = v_company_id
      AND ppc.content_version = v_content_version
      AND ppc.content_hash = v_payload_hash
    LIMIT 1;
  END IF;

  IF v_payload_content_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao resolver payload_content_id';
  END IF;

  v_counter_year := EXTRACT(YEAR FROM v_period_start);

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

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'items deve ser um array JSON';
  END IF;

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
    INSERT INTO public.print_item_content (
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
      FROM public.print_item_content pic
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

-- =====================================================
-- RPC: get snapshot (dual-read)
-- If content FK exists -> read from content tables.
-- Else -> fallback to legacy snapshot columns.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_prescription_print_snapshot(
  p_prescription_print_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_has_print_permission boolean;
  v_payload jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
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

  v_has_print_permission :=
    public.has_permission(v_user_id, 'prescriptions', 'print')
    OR public.has_permission(v_user_id, 'prescriptions', 'edit')
    OR public.has_permission(v_user_id, 'prescriptions', 'create')
    OR public.has_permission(v_user_id, 'prescriptions', 'approve');

  IF NOT v_has_print_permission THEN
    RAISE EXCEPTION 'Usuario sem permissao para reimprimir prescricao';
  END IF;

  SELECT jsonb_build_object(
    'id', pp.id,
    'prescription_id', pp.prescription_id,
    'print_number', pp.print_number,
    'period_start', pp.period_start,
    'period_end', pp.period_end,
    'week_start_day', pp.week_start_day,
    'patient_snapshot', COALESCE(ppc.patient_snapshot, pp.patient_snapshot, '{}'::jsonb),
    'notes_snapshot', COALESCE(ppc.notes_snapshot, pp.notes_snapshot),
    'metadata_snapshot', COALESCE(ppc.metadata_snapshot, pp.metadata_snapshot, '{}'::jsonb),
    'created_at', pp.created_at,
    'created_by', pp.created_by,
    'created_by_name', au.name,
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ppi.id,
          'source_prescription_item_id', ppi.source_prescription_item_id,
          'order_index', ppi.order_index,
          'description_snapshot', COALESCE(pic.description_snapshot, ppi.description_snapshot),
          'route_snapshot', COALESCE(pic.route_snapshot, ppi.route_snapshot),
          'frequency_snapshot', COALESCE(pic.frequency_snapshot, ppi.frequency_snapshot),
          'grid_snapshot', COALESCE(pic.grid_snapshot, ppi.grid_snapshot, '[]'::jsonb),
          'created_at', ppi.created_at
        )
        ORDER BY ppi.order_index, ppi.created_at
      )
      FROM public.prescription_print_item ppi
      LEFT JOIN public.print_item_content pic
        ON pic.id = ppi.item_content_id
       AND pic.company_id = ppi.company_id
      WHERE ppi.prescription_print_id = pp.id
        AND ppi.company_id = pp.company_id
    ), '[]'::jsonb)
  )
  INTO v_payload
  FROM public.prescription_print pp
  LEFT JOIN public.print_payload_content ppc
    ON ppc.id = pp.payload_content_id
   AND ppc.company_id = pp.company_id
  LEFT JOIN public.app_user au
    ON au.auth_user_id = pp.created_by
   AND au.company_id = pp.company_id
  WHERE pp.id = p_prescription_print_id
    AND pp.company_id = v_company_id;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Impressao nao encontrada para a empresa do usuario';
  END IF;

  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prescription_print_snapshot(uuid) TO authenticated;

-- =====================================================
-- RPC: list snapshots for one prescription
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_prescription_prints(
  p_prescription_id uuid
)
RETURNS TABLE (
  id uuid,
  print_number text,
  period_start date,
  period_end date,
  week_start_day smallint,
  created_at timestamptz,
  created_by uuid,
  created_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_has_print_permission boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_prescription_id IS NULL THEN
    RAISE EXCEPTION 'prescription_id obrigatorio';
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

  v_has_print_permission :=
    public.has_permission(v_user_id, 'prescriptions', 'print')
    OR public.has_permission(v_user_id, 'prescriptions', 'edit')
    OR public.has_permission(v_user_id, 'prescriptions', 'create')
    OR public.has_permission(v_user_id, 'prescriptions', 'approve');

  IF NOT v_has_print_permission THEN
    RAISE EXCEPTION 'Usuario sem permissao para visualizar impressoes da prescricao';
  END IF;

  RETURN QUERY
  SELECT
    pp.id,
    pp.print_number,
    pp.period_start,
    pp.period_end,
    pp.week_start_day,
    pp.created_at,
    pp.created_by,
    au.name AS created_by_name
  FROM public.prescription_print pp
  LEFT JOIN public.app_user au ON au.auth_user_id = pp.created_by
  WHERE pp.prescription_id = p_prescription_id
    AND pp.company_id = v_company_id
  ORDER BY pp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_prescription_prints(uuid) TO authenticated;

-- =====================================================
-- RPC: create or upsert prescription by unique period
-- This function does not touch print snapshots.
-- Items merge stays outside this RPC (same as current item endpoints).
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_or_upsert_prescription(
  p_patient_id uuid,
  p_type public.enum_prescription_type,
  p_start_date date,
  p_end_date date,
  p_status text DEFAULT 'draft',
  p_notes text DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL,
  p_attachment_url text DEFAULT NULL
)
RETURNS TABLE (
  prescription_id uuid,
  upserted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_prescription_id uuid;
  v_existing_id uuid;
  v_can_create boolean;
  v_can_edit boolean;
  v_status_normalized text;
  v_status_to_apply text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id obrigatorio';
  END IF;

  IF p_type IS NULL THEN
    RAISE EXCEPTION 'type obrigatorio';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'start_date e end_date obrigatorios';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'end_date deve ser maior ou igual a start_date';
  END IF;

  v_status_normalized := NULLIF(lower(trim(COALESCE(p_status, ''))), '');
  IF v_status_normalized IN ('draft', 'active', 'suspended', 'finished') THEN
    v_status_to_apply := v_status_normalized;
  ELSE
    v_status_to_apply := NULL;
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
    FROM public.patient pt
    WHERE pt.id = p_patient_id
      AND pt.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Paciente nao encontrado para a empresa do usuario';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id = p_professional_id
      AND pr.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Profissional nao encontrado para a empresa do usuario';
  END IF;

  v_can_create := public.has_permission(v_user_id, 'prescriptions', 'create');
  v_can_edit := public.has_permission(v_user_id, 'prescriptions', 'edit')
                OR public.has_permission(v_user_id, 'prescriptions', 'approve');

  IF NOT v_can_create AND NOT v_can_edit THEN
    RAISE EXCEPTION 'Usuario sem permissao para criar ou editar prescricao';
  END IF;

  SELECT p.id
    INTO v_existing_id
  FROM public.prescription p
  WHERE p.company_id = v_company_id
    AND p.patient_id = p_patient_id
    AND p.type = p_type
    AND p.start_date = p_start_date
    AND p.end_date = p_end_date
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF NOT v_can_edit THEN
      RAISE EXCEPTION 'Prescricao ja existe para este periodo e usuario nao possui permissao de edicao';
    END IF;

    UPDATE public.prescription
    SET status = COALESCE(v_status_to_apply, status),
        notes = p_notes,
        professional_id = p_professional_id,
        attachment_url = p_attachment_url,
        updated_at = now()
    WHERE id = v_existing_id
      AND company_id = v_company_id
    RETURNING id INTO v_prescription_id;

    RETURN QUERY SELECT v_prescription_id, TRUE;
    RETURN;
  END IF;

  IF NOT v_can_create THEN
    RAISE EXCEPTION 'Usuario sem permissao para criar prescricao';
  END IF;

  BEGIN
    INSERT INTO public.prescription (
      company_id,
      patient_id,
      professional_id,
      type,
      start_date,
      end_date,
      status,
      notes,
      attachment_url
    )
    VALUES (
      v_company_id,
      p_patient_id,
      p_professional_id,
      p_type,
      p_start_date,
      p_end_date,
      COALESCE(v_status_to_apply, 'draft'),
      p_notes,
      p_attachment_url
    )
    RETURNING id INTO v_prescription_id;

    RETURN QUERY SELECT v_prescription_id, FALSE;
    RETURN;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT p.id
        INTO v_existing_id
      FROM public.prescription p
      WHERE p.company_id = v_company_id
        AND p.patient_id = p_patient_id
        AND p.type = p_type
        AND p.start_date = p_start_date
        AND p.end_date = p_end_date
      LIMIT 1;

      IF v_existing_id IS NULL THEN
        RAISE EXCEPTION 'Falha ao resolver prescricao existente apos conflito de unicidade';
      END IF;

      IF NOT v_can_edit THEN
        RAISE EXCEPTION 'Prescricao ja existe para este periodo e usuario nao possui permissao de edicao';
      END IF;

      UPDATE public.prescription
      SET status = COALESCE(v_status_to_apply, status),
          notes = p_notes,
          professional_id = p_professional_id,
          attachment_url = p_attachment_url,
          updated_at = now()
      WHERE id = v_existing_id
        AND company_id = v_company_id
      RETURNING id INTO v_prescription_id;

      RETURN QUERY SELECT v_prescription_id, TRUE;
      RETURN;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_upsert_prescription(uuid, public.enum_prescription_type, date, date, text, text, uuid, text) TO authenticated;

COMMIT;
