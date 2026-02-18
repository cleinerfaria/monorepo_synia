BEGIN;

-- =====================================================
-- PRESCRIPTION PRINT SNAPSHOT (SEMANAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prescription_print_counter (
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  counter_year integer NOT NULL CHECK (counter_year BETWEEN 2000 AND 2999),
  last_value integer NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_print_counter_pkey PRIMARY KEY (company_id, counter_year)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'update_prescription_print_counter_updated_at'
      AND t.tgrelid = 'public.prescription_print_counter'::regclass
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE 'DROP TRIGGER update_prescription_print_counter_updated_at ON public.prescription_print_counter';
  END IF;
END $$;
CREATE TRIGGER update_prescription_print_counter_updated_at
BEFORE UPDATE ON public.prescription_print_counter
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.prescription_print (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  prescription_id uuid NOT NULL REFERENCES public.prescription(id) ON DELETE CASCADE,
  print_year integer NOT NULL CHECK (print_year BETWEEN 2000 AND 2999),
  print_seq integer NOT NULL CHECK (print_seq > 0),
  print_number text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  week_start_day smallint NOT NULL CHECK (week_start_day BETWEEN 0 AND 6),
  patient_snapshot jsonb NOT NULL,
  notes_snapshot text NULL,
  metadata_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  CONSTRAINT chk_prescription_print_period CHECK (
    period_end >= period_start
    AND (period_end - period_start + 1) BETWEEN 1 AND 7
  ),
  CONSTRAINT prescription_print_company_year_seq_unique UNIQUE (company_id, print_year, print_seq),
  CONSTRAINT prescription_print_company_number_unique UNIQUE (company_id, print_number)
);

CREATE INDEX IF NOT EXISTS idx_prescription_print_company_created
  ON public.prescription_print (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_print_company_prescription_created
  ON public.prescription_print (company_id, prescription_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.prescription_print_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  prescription_print_id uuid NOT NULL REFERENCES public.prescription_print(id) ON DELETE CASCADE,
  source_prescription_item_id uuid NULL REFERENCES public.prescription_item(id) ON DELETE SET NULL,
  order_index integer NOT NULL CHECK (order_index > 0),
  description_snapshot text NOT NULL,
  route_snapshot text NULL,
  frequency_snapshot text NULL,
  grid_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_print_item_order_unique UNIQUE (prescription_print_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_prescription_print_item_company_print
  ON public.prescription_print_item (company_id, prescription_print_id);

ALTER TABLE public.prescription_print ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_print_item ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print' AND policyname = 'Users can view prescription prints in their company') THEN
    EXECUTE 'DROP POLICY "Users can view prescription prints in their company" ON public.prescription_print';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print' AND policyname = 'Users can insert prescription prints in their company') THEN
    EXECUTE 'DROP POLICY "Users can insert prescription prints in their company" ON public.prescription_print';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print' AND policyname = 'Users can update prescription prints in their company') THEN
    EXECUTE 'DROP POLICY "Users can update prescription prints in their company" ON public.prescription_print';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print' AND policyname = 'Users can delete prescription prints in their company') THEN
    EXECUTE 'DROP POLICY "Users can delete prescription prints in their company" ON public.prescription_print';
  END IF;
END $$;

CREATE POLICY "Users can view prescription prints in their company"
  ON public.prescription_print
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert prescription prints in their company"
  ON public.prescription_print
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update prescription prints in their company"
  ON public.prescription_print
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete prescription prints in their company"
  ON public.prescription_print
  FOR DELETE
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item' AND policyname = 'Users can view prescription print items in their company') THEN
    EXECUTE 'DROP POLICY "Users can view prescription print items in their company" ON public.prescription_print_item';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item' AND policyname = 'Users can insert prescription print items in their company') THEN
    EXECUTE 'DROP POLICY "Users can insert prescription print items in their company" ON public.prescription_print_item';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item' AND policyname = 'Users can update prescription print items in their company') THEN
    EXECUTE 'DROP POLICY "Users can update prescription print items in their company" ON public.prescription_print_item';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item' AND policyname = 'Users can delete prescription print items in their company') THEN
    EXECUTE 'DROP POLICY "Users can delete prescription print items in their company" ON public.prescription_print_item';
  END IF;
END $$;

CREATE POLICY "Users can view prescription print items in their company"
  ON public.prescription_print_item
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert prescription print items in their company"
  ON public.prescription_print_item
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update prescription print items in their company"
  ON public.prescription_print_item
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete prescription print items in their company"
  ON public.prescription_print_item
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- =====================================================
-- RBAC: adicionar permissao de impressao no modulo prescriptions
-- =====================================================

INSERT INTO public.module_permission (module_id, code, name, description)
SELECT sm.id, 'print', 'Imprimir', 'Gerar e reimprimir prescricoes semanais'
FROM public.system_module sm
WHERE sm.code = 'prescriptions'
ON CONFLICT (module_id, code) DO NOTHING;

INSERT INTO public.access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM public.access_profile ap
JOIN public.system_module sm ON sm.code = 'prescriptions'
JOIN public.module_permission mp ON mp.module_id = sm.id AND mp.code = 'print'
WHERE ap.is_system = TRUE
  AND ap.code IN ('manager', 'clinician')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- =====================================================
-- RPC: criar snapshot de impressao (transacional)
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

  v_counter_year := EXTRACT(YEAR FROM v_period_start);

  -- Incrementa contador anual por empresa com seguranca de concorrencia.
  INSERT INTO public.prescription_print_counter (
    company_id,
    counter_year,
    last_value
  )
  VALUES (v_company_id, v_counter_year, 1)
  ON CONFLICT (company_id, counter_year)
  DO UPDATE SET
    last_value = public.prescription_print_counter.last_value + 1,
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

    INSERT INTO public.prescription_print_item (
      company_id,
      prescription_print_id,
      source_prescription_item_id,
      order_index,
      description_snapshot,
      route_snapshot,
      frequency_snapshot,
      grid_snapshot
    ) VALUES (
      v_company_id,
      v_print_id,
      v_source_item_id,
      v_order_index,
      COALESCE(NULLIF(v_item->>'description_snapshot', ''), 'Item sem descricao'),
      NULLIF(v_item->>'route_snapshot', ''),
      NULLIF(v_item->>'frequency_snapshot', ''),
      v_grid
    );
  END LOOP;

  RETURN QUERY
  SELECT v_print_id, v_print_number, v_period_start, v_period_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_prescription_print_snapshot(uuid, date, date, smallint, jsonb, text, jsonb, jsonb) TO authenticated;

-- =====================================================
-- RPC: obter snapshot completo para reimpressao
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
    'patient_snapshot', pp.patient_snapshot,
    'notes_snapshot', pp.notes_snapshot,
    'metadata_snapshot', pp.metadata_snapshot,
    'created_at', pp.created_at,
    'created_by', pp.created_by,
    'created_by_name', au.name,
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ppi.id,
          'source_prescription_item_id', ppi.source_prescription_item_id,
          'order_index', ppi.order_index,
          'description_snapshot', ppi.description_snapshot,
          'route_snapshot', ppi.route_snapshot,
          'frequency_snapshot', ppi.frequency_snapshot,
          'grid_snapshot', ppi.grid_snapshot,
          'created_at', ppi.created_at
        )
        ORDER BY ppi.order_index, ppi.created_at
      )
      FROM public.prescription_print_item ppi
      WHERE ppi.prescription_print_id = pp.id
        AND ppi.company_id = pp.company_id
    ), '[]'::jsonb)
  )
  INTO v_payload
  FROM public.prescription_print pp
  LEFT JOIN public.app_user au ON au.auth_user_id = pp.created_by
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
-- RPC: listar impressoes de uma prescricao
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

COMMIT;
