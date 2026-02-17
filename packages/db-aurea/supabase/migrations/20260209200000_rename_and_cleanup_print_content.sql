BEGIN;

-- =====================================================
-- Rename deduplicated print content tables to prescription_ prefix
-- =====================================================
DO $$
BEGIN
  IF to_regclass('public.print_payload_content') IS NOT NULL
     AND to_regclass('public.prescription_print_payload_content') IS NULL THEN
    EXECUTE 'ALTER TABLE public.print_payload_content RENAME TO prescription_print_payload_content';
  END IF;

  IF to_regclass('public.print_item_content') IS NOT NULL
     AND to_regclass('public.prescription_print_item_content') IS NULL THEN
    EXECUTE 'ALTER TABLE public.print_item_content RENAME TO prescription_print_item_content';
  END IF;
END;
$$;

-- =====================================================
-- Index names and guarantees
-- =====================================================
DO $$
BEGIN
  IF to_regclass('public.idx_print_payload_content_company_hash') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_payload_content_company_hash') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_payload_content_company_hash RENAME TO idx_prescription_print_payload_content_company_hash';
  END IF;

  IF to_regclass('public.idx_print_payload_content_company_content_hash') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_payload_content_company_content_hash') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_payload_content_company_content_hash RENAME TO idx_prescription_print_payload_content_company_content_hash';
  END IF;

  IF to_regclass('public.idx_print_item_content_company_hash') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_item_content_company_hash') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_item_content_company_hash RENAME TO idx_prescription_print_item_content_company_hash';
  END IF;

  IF to_regclass('public.idx_print_item_content_company_content_hash') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_item_content_company_content_hash') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_item_content_company_content_hash RENAME TO idx_prescription_print_item_content_company_content_hash';
  END IF;

  IF to_regclass('public.idx_print_payload_content_id') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_payload_content_id') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_payload_content_id RENAME TO idx_prescription_print_payload_content_id';
  END IF;

  IF to_regclass('public.idx_print_item_content_id') IS NOT NULL
     AND to_regclass('public.idx_prescription_print_item_content_id') IS NULL THEN
    EXECUTE 'ALTER INDEX public.idx_print_item_content_id RENAME TO idx_prescription_print_item_content_id';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.idx_prescription_print_payload_content_company_hash') IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_prescription_print_payload_content_company_hash ON public.prescription_print_payload_content (company_id, content_version, content_hash)';
  END IF;
  IF to_regclass('public.idx_prescription_print_payload_content_company_content_hash') IS NULL THEN
    EXECUTE 'CREATE INDEX idx_prescription_print_payload_content_company_content_hash ON public.prescription_print_payload_content (company_id, content_hash)';
  END IF;
  IF to_regclass('public.idx_prescription_print_item_content_company_hash') IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_prescription_print_item_content_company_hash ON public.prescription_print_item_content (company_id, content_version, content_hash)';
  END IF;
  IF to_regclass('public.idx_prescription_print_item_content_company_content_hash') IS NULL THEN
    EXECUTE 'CREATE INDEX idx_prescription_print_item_content_company_content_hash ON public.prescription_print_item_content (company_id, content_hash)';
  END IF;
  IF to_regclass('public.idx_prescription_print_payload_content_id') IS NULL THEN
    EXECUTE 'CREATE INDEX idx_prescription_print_payload_content_id ON public.prescription_print (payload_content_id)';
  END IF;
  IF to_regclass('public.idx_prescription_print_item_content_id') IS NULL THEN
    EXECUTE 'CREATE INDEX idx_prescription_print_item_content_id ON public.prescription_print_item (item_content_id)';
  END IF;
END $$;

-- =====================================================
-- Ensure FK targets point to renamed tables
-- =====================================================
DO $$
BEGIN
  IF to_regclass('public.prescription_print') IS NOT NULL
     AND to_regclass('public.prescription_print_payload_content') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       WHERE c.conname = 'prescription_print_payload_content_id_fkey'
         AND c.conrelid = 'public.prescription_print'::regclass
         AND c.confrelid = 'public.prescription_print_payload_content'::regclass
     ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conname = 'prescription_print_payload_content_id_fkey'
        AND c.conrelid = 'public.prescription_print'::regclass
    ) THEN
      EXECUTE 'ALTER TABLE public.prescription_print DROP CONSTRAINT prescription_print_payload_content_id_fkey';
    END IF;

    EXECUTE '
      ALTER TABLE public.prescription_print
      ADD CONSTRAINT prescription_print_payload_content_id_fkey
      FOREIGN KEY (payload_content_id)
      REFERENCES public.prescription_print_payload_content(id)
      ON DELETE RESTRICT
    ';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.prescription_print_item') IS NOT NULL
     AND to_regclass('public.prescription_print_item_content') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       WHERE c.conname = 'prescription_print_item_item_content_id_fkey'
         AND c.conrelid = 'public.prescription_print_item'::regclass
         AND c.confrelid = 'public.prescription_print_item_content'::regclass
     ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conname = 'prescription_print_item_item_content_id_fkey'
        AND c.conrelid = 'public.prescription_print_item'::regclass
    ) THEN
      EXECUTE 'ALTER TABLE public.prescription_print_item DROP CONSTRAINT prescription_print_item_item_content_id_fkey';
    END IF;

    EXECUTE '
      ALTER TABLE public.prescription_print_item
      ADD CONSTRAINT prescription_print_item_item_content_id_fkey
      FOREIGN KEY (item_content_id)
      REFERENCES public.prescription_print_item_content(id)
      ON DELETE RESTRICT
    ';
  END IF;
END;
$$;

-- =====================================================
-- RLS + permissions on renamed tables
-- =====================================================
ALTER TABLE IF EXISTS public.prescription_print_payload_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prescription_print_payload_content FROM PUBLIC;
GRANT SELECT, INSERT ON public.prescription_print_payload_content TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_payload_content' AND policyname = 'Users can view print payload content') THEN
    EXECUTE 'DROP POLICY "Users can view print payload content" ON public.prescription_print_payload_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_payload_content' AND policyname = 'Users can insert print payload content') THEN
    EXECUTE 'DROP POLICY "Users can insert print payload content" ON public.prescription_print_payload_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_payload_content' AND policyname = 'Users can view prescription print payload content') THEN
    EXECUTE 'DROP POLICY "Users can view prescription print payload content" ON public.prescription_print_payload_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_payload_content' AND policyname = 'Users can insert prescription print payload content') THEN
    EXECUTE 'DROP POLICY "Users can insert prescription print payload content" ON public.prescription_print_payload_content';
  END IF;
END $$;

CREATE POLICY "Users can view prescription print payload content"
  ON public.prescription_print_payload_content
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert prescription print payload content"
  ON public.prescription_print_payload_content
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

ALTER TABLE IF EXISTS public.prescription_print_item_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prescription_print_item_content FROM PUBLIC;
GRANT SELECT, INSERT ON public.prescription_print_item_content TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item_content' AND policyname = 'Users can view print item content') THEN
    EXECUTE 'DROP POLICY "Users can view print item content" ON public.prescription_print_item_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item_content' AND policyname = 'Users can insert print item content') THEN
    EXECUTE 'DROP POLICY "Users can insert print item content" ON public.prescription_print_item_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item_content' AND policyname = 'Users can view prescription print item content') THEN
    EXECUTE 'DROP POLICY "Users can view prescription print item content" ON public.prescription_print_item_content';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_item_content' AND policyname = 'Users can insert prescription print item content') THEN
    EXECUTE 'DROP POLICY "Users can insert prescription print item content" ON public.prescription_print_item_content';
  END IF;
END $$;

CREATE POLICY "Users can view prescription print item content"
  ON public.prescription_print_item_content
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert prescription print item content"
  ON public.prescription_print_item_content
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

COMMENT ON COLUMN public.prescription_print.payload_content_id IS
  'Reference to deduplicated payload content in prescription_print_payload_content.';

COMMENT ON COLUMN public.prescription_print_item.item_content_id IS
  'Reference to deduplicated item content in prescription_print_item_content.';

-- =====================================================
-- Cleanup orphan deduplicated content when print rows are deleted
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_orphan_prescription_print_payload_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.payload_content_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.prescription_print_payload_content ppc
  WHERE ppc.id = OLD.payload_content_id
    AND ppc.company_id = OLD.company_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.prescription_print pp
      WHERE pp.payload_content_id = ppc.id
        AND pp.company_id = ppc.company_id
    );

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_orphan_prescription_print_item_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.item_content_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.prescription_print_item_content pic
  WHERE pic.id = OLD.item_content_id
    AND pic.company_id = OLD.company_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.prescription_print_item ppi
      WHERE ppi.item_content_id = pic.id
        AND ppi.company_id = pic.company_id
    );

  RETURN OLD;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.prescription_print') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgname = 'trg_cleanup_orphan_prescription_print_payload_content'
        AND t.tgrelid = 'public.prescription_print'::regclass
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE 'DROP TRIGGER trg_cleanup_orphan_prescription_print_payload_content ON public.prescription_print';
    END IF;
    EXECUTE '
      CREATE TRIGGER trg_cleanup_orphan_prescription_print_payload_content
      AFTER DELETE ON public.prescription_print
      FOR EACH ROW
      EXECUTE FUNCTION public.cleanup_orphan_prescription_print_payload_content()
    ';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.prescription_print_item') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgname = 'trg_cleanup_orphan_prescription_print_item_content'
        AND t.tgrelid = 'public.prescription_print_item'::regclass
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE 'DROP TRIGGER trg_cleanup_orphan_prescription_print_item_content ON public.prescription_print_item';
    END IF;
    EXECUTE '
      CREATE TRIGGER trg_cleanup_orphan_prescription_print_item_content
      AFTER DELETE ON public.prescription_print_item
      FOR EACH ROW
      EXECUTE FUNCTION public.cleanup_orphan_prescription_print_item_content()
    ';
  END IF;
END;
$$;

-- =====================================================
-- RPCs updated explicitly to renamed tables
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
    AND au.active = TRUE
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

CREATE OR REPLACE FUNCTION public.get_prescription_print_snapshot(
  p_prescription_print_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    AND au.active = TRUE
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
      LEFT JOIN public.prescription_print_item_content pic
        ON pic.id = ppi.item_content_id
       AND pic.company_id = ppi.company_id
      WHERE ppi.prescription_print_id = pp.id
        AND ppi.company_id = pp.company_id
    ), '[]'::jsonb)
  )
  INTO v_payload
  FROM public.prescription_print pp
  LEFT JOIN public.prescription_print_payload_content ppc
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
SET search_path = public, pg_temp
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
    AND au.active = TRUE
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

GRANT EXECUTE ON FUNCTION public.create_prescription_print_snapshot(uuid, date, date, smallint, jsonb, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prescription_print_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_prescription_prints(uuid) TO authenticated;

COMMIT;
