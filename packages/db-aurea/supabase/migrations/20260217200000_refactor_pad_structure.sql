BEGIN;

-- =====================================================
-- MIGRATION: Refatoração PAD (Plano de Atendimento Domiciliar)
--
-- Mudanças:
--   1. Renomear tabelas: patient_attendance_demand → pad,
--      patient_attendance_shift → pad_shift,
--      patient_attendance_event → pad_event
--   2. Renomear enums para consistência
--   3. Criar tabela pad_items com 3 tipos (shift, visit, session)
--   4. Migrar dados existentes (PAD → pad_items tipo shift)
--   5. Atualizar FK de pad_shift para pad_items
--   6. Remover colunas hours_per_day e is_split do pad
--   7. Recriar RPCs com novos nomes de tabela
--   8. Atualizar RLS policies
-- =====================================================

-- =====================================================
-- PARTE 1: Criar novos enums
-- =====================================================
CREATE TYPE public.enum_pad_item_type AS ENUM ('shift', 'visit', 'session');
CREATE TYPE public.enum_pad_item_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly');

-- =====================================================
-- PARTE 2: Renomear enums existentes
-- =====================================================
ALTER TYPE public.enum_patient_attendance_shift_status RENAME TO enum_pad_shift_status;
ALTER TYPE public.enum_patient_attendance_event_type RENAME TO enum_pad_event_type;

-- =====================================================
-- PARTE 3: Dropar RPCs que referenciam tabelas/tipos antigos
-- (precisam ser recriados após renomear tabelas)
-- =====================================================
DROP FUNCTION IF EXISTS public.generate_patient_attendance_shifts(uuid, date, date);
DROP FUNCTION IF EXISTS public.list_my_shifts(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_my_active_shift();
DROP FUNCTION IF EXISTS public.shift_check_in(uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.shift_check_out(uuid, numeric, numeric);

-- =====================================================
-- PARTE 4: Renomear tabelas
-- =====================================================
ALTER TABLE public.patient_attendance_demand RENAME TO pad;
ALTER TABLE public.patient_attendance_shift RENAME TO pad_shift;
ALTER TABLE public.patient_attendance_event RENAME TO pad_event;

-- =====================================================
-- PARTE 5: Criar tabela pad_items
-- =====================================================
CREATE TABLE public.pad_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pad_id        UUID NOT NULL REFERENCES public.pad(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  type          public.enum_pad_item_type NOT NULL,
  profession_id UUID NOT NULL REFERENCES public.profession(id) ON DELETE RESTRICT,

  -- Campos específicos de shift (plantão)
  hours_per_day         INTEGER,
  shift_duration_hours  INTEGER,

  -- Campos específicos de visit/session
  frequency    public.enum_pad_item_frequency,
  quantity     INTEGER,

  is_active    BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints condicionais por tipo
  CONSTRAINT chk_pad_item_shift_fields CHECK (
    type <> 'shift' OR (
      hours_per_day IS NOT NULL AND hours_per_day IN (4,6,12,24)
      AND shift_duration_hours IS NOT NULL
      AND shift_duration_hours > 0 AND shift_duration_hours <= hours_per_day
    )
  ),
  CONSTRAINT chk_pad_item_visit_session_fields CHECK (
    type NOT IN ('visit','session') OR (
      frequency IS NOT NULL AND quantity IS NOT NULL AND quantity > 0
    )
  ),
  CONSTRAINT chk_pad_item_shift_no_freq CHECK (
    type <> 'shift' OR (frequency IS NULL AND quantity IS NULL)
  ),
  CONSTRAINT chk_pad_item_visit_session_no_shift_fields CHECK (
    type NOT IN ('visit','session') OR (hours_per_day IS NULL AND shift_duration_hours IS NULL)
  )
);

CREATE INDEX idx_pad_items_pad_id ON public.pad_items (pad_id);
CREATE INDEX idx_pad_items_company_type ON public.pad_items (company_id, type);

CREATE TRIGGER update_pad_items_updated_at
  BEFORE UPDATE ON public.pad_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 6: Migrar dados existentes
-- Para cada PAD existente, criar um pad_item tipo 'shift'
-- usando hours_per_day e is_split do PAD antigo
-- =====================================================
DO $$
DECLARE
  v_pad RECORD;
  v_profession_id UUID;
  v_new_item_id UUID;
  v_shift_duration INTEGER;
BEGIN
  FOR v_pad IN
    SELECT p.id, p.company_id, p.hours_per_day, p.is_split
    FROM public.pad p
  LOOP
    -- Buscar profissão "Técnico de Enfermagem" na mesma empresa
    SELECT id INTO v_profession_id
    FROM public.profession
    WHERE company_id = v_pad.company_id
      AND LOWER(name) LIKE '%t_cnic%enferm%'
      AND active = true
    LIMIT 1;

    -- Fallback: qualquer profissão ativa da empresa
    IF v_profession_id IS NULL THEN
      SELECT id INTO v_profession_id
      FROM public.profession
      WHERE company_id = v_pad.company_id
        AND active = true
      LIMIT 1;
    END IF;

    -- Se não há profissão, pular (não deveria acontecer com dados válidos)
    IF v_profession_id IS NULL THEN
      RAISE WARNING 'Nenhuma profissão encontrada para company_id=%', v_pad.company_id;
      CONTINUE;
    END IF;

    -- Calcular shift_duration_hours a partir de is_split
    IF v_pad.is_split AND v_pad.hours_per_day = 24 THEN
      v_shift_duration := 12;
    ELSIF v_pad.is_split AND v_pad.hours_per_day = 12 THEN
      v_shift_duration := 6;
    ELSE
      v_shift_duration := v_pad.hours_per_day;
    END IF;

    -- Criar pad_item tipo shift
    INSERT INTO public.pad_items (pad_id, company_id, type, profession_id, hours_per_day, shift_duration_hours)
    VALUES (v_pad.id, v_pad.company_id, 'shift', v_profession_id, v_pad.hours_per_day, v_shift_duration)
    RETURNING id INTO v_new_item_id;

    -- Atualizar shifts existentes que referenciam este PAD
    UPDATE public.pad_shift
    SET patient_attendance_demand_id = v_new_item_id
    WHERE patient_attendance_demand_id = v_pad.id;

  END LOOP;
END $$;

-- =====================================================
-- PARTE 7: Renomear coluna FK e alterar constraint
-- =====================================================
ALTER TABLE public.pad_shift RENAME COLUMN patient_attendance_demand_id TO pad_item_id;

-- Dropar FK antiga (que apontava para pad(id)) e criar nova (apontando para pad_items(id))
-- O nome da constraint pode variar, vamos dropar pelo nome da coluna
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.pad_shift'::regclass
    AND contype = 'f'
    AND EXISTS (
      SELECT 1 FROM unnest(conkey) AS k
      JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k
      WHERE a.attname = 'pad_item_id'
    );

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.pad_shift DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.pad_shift
  ADD CONSTRAINT pad_shift_pad_item_id_fkey
  FOREIGN KEY (pad_item_id) REFERENCES public.pad_items(id) ON DELETE CASCADE;

-- =====================================================
-- PARTE 8: Remover colunas do pad
-- =====================================================
ALTER TABLE public.pad DROP CONSTRAINT IF EXISTS chk_pad_hours_per_day_valid;
ALTER TABLE public.pad DROP CONSTRAINT IF EXISTS chk_pad_split_rules;
ALTER TABLE public.pad DROP COLUMN IF EXISTS hours_per_day;
ALTER TABLE public.pad DROP COLUMN IF EXISTS is_split;

-- =====================================================
-- PARTE 9: Renomear triggers
-- =====================================================
ALTER TRIGGER update_patient_attendance_demand_updated_at ON public.pad
  RENAME TO update_pad_updated_at;

ALTER TRIGGER update_patient_attendance_shift_updated_at ON public.pad_shift
  RENAME TO update_pad_shift_updated_at;

-- =====================================================
-- PARTE 10: Renomear RLS policies
-- =====================================================

-- pad (was patient_attendance_demand)
DROP POLICY IF EXISTS "patient_attendance_demand_select_policy" ON public.pad;
DROP POLICY IF EXISTS "patient_attendance_demand_insert_policy" ON public.pad;
DROP POLICY IF EXISTS "patient_attendance_demand_update_policy" ON public.pad;
DROP POLICY IF EXISTS "patient_attendance_demand_delete_policy" ON public.pad;

CREATE POLICY "pad_select_policy" ON public.pad FOR SELECT
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_insert_policy" ON public.pad FOR INSERT
  WITH CHECK (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_update_policy" ON public.pad FOR UPDATE
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_delete_policy" ON public.pad FOR DELETE
  USING (company_id = (SELECT get_user_company_id()));

-- pad_shift (was patient_attendance_shift)
DROP POLICY IF EXISTS "patient_attendance_shift_select_policy" ON public.pad_shift;
DROP POLICY IF EXISTS "patient_attendance_shift_insert_policy" ON public.pad_shift;
DROP POLICY IF EXISTS "patient_attendance_shift_update_policy" ON public.pad_shift;
DROP POLICY IF EXISTS "patient_attendance_shift_delete_policy" ON public.pad_shift;

CREATE POLICY "pad_shift_select_policy" ON public.pad_shift FOR SELECT
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_shift_insert_policy" ON public.pad_shift FOR INSERT
  WITH CHECK (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_shift_update_policy" ON public.pad_shift FOR UPDATE
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_shift_delete_policy" ON public.pad_shift FOR DELETE
  USING (company_id = (SELECT get_user_company_id()));

-- pad_event (was patient_attendance_event)
DROP POLICY IF EXISTS "patient_attendance_event_select_policy" ON public.pad_event;
DROP POLICY IF EXISTS "patient_attendance_event_insert_policy" ON public.pad_event;
DROP POLICY IF EXISTS "patient_attendance_event_update_policy" ON public.pad_event;
DROP POLICY IF EXISTS "patient_attendance_event_delete_policy" ON public.pad_event;

CREATE POLICY "pad_event_select_policy" ON public.pad_event FOR SELECT
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_event_insert_policy" ON public.pad_event FOR INSERT
  WITH CHECK (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_event_update_policy" ON public.pad_event FOR UPDATE
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_event_delete_policy" ON public.pad_event FOR DELETE
  USING (company_id = (SELECT get_user_company_id()));

-- pad_items (nova tabela)
ALTER TABLE public.pad_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pad_items_select_policy" ON public.pad_items FOR SELECT
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_items_insert_policy" ON public.pad_items FOR INSERT
  WITH CHECK (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_items_update_policy" ON public.pad_items FOR UPDATE
  USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "pad_items_delete_policy" ON public.pad_items FOR DELETE
  USING (company_id = (SELECT get_user_company_id()));

-- =====================================================
-- PARTE 11: Recriar RPCs com novos nomes de tabela
-- =====================================================

-- generate_pad_shifts (was generate_patient_attendance_shifts)
CREATE OR REPLACE FUNCTION public.generate_pad_shifts(
  p_pad_item_id uuid,
  p_date_from date,
  p_date_to date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item public.pad_items;
  v_pad public.pad;
  v_day date;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_shift_duration interval;
  v_num_shifts integer;
  v_shift_idx integer;
BEGIN

  -- Carrega pad_item
  SELECT *
  INTO v_item
  FROM public.pad_items
  WHERE id = p_pad_item_id
    AND type = 'shift'
    AND is_active = true;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'PAD item not found, not a shift type, or inactive';
  END IF;

  -- Carrega PAD (para start_time, start_date, end_date)
  SELECT *
  INTO v_pad
  FROM public.pad
  WHERE id = v_item.pad_id
    AND is_active = true;

  IF v_pad.id IS NULL THEN
    RAISE EXCEPTION 'PAD not found or inactive';
  END IF;

  IF p_date_from > p_date_to THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  -- Calcular duração de cada turno e número de turnos/dia
  v_shift_duration := (v_item.shift_duration_hours || ' hours')::interval;
  v_num_shifts := v_item.hours_per_day / v_item.shift_duration_hours;

  -- Loop por dia
  FOR v_day IN
    SELECT generate_series(
      GREATEST(v_pad.start_date, p_date_from),
      LEAST(COALESCE(v_pad.end_date, p_date_to), p_date_to),
      interval '1 day'
    )::date
  LOOP

    v_shift_start := (v_day::timestamp + v_pad.start_time);

    -- Gerar N turnos por dia
    FOR v_shift_idx IN 1..v_num_shifts LOOP

      v_shift_end := v_shift_start + v_shift_duration;

      INSERT INTO public.pad_shift(
        company_id,
        patient_id,
        pad_item_id,
        start_at,
        end_at,
        status
      )
      VALUES(
        v_pad.company_id,
        v_pad.patient_id,
        v_item.id,
        v_shift_start,
        v_shift_end,
        'open'
      )
      ON CONFLICT DO NOTHING;

      v_shift_start := v_shift_end;

    END LOOP;

  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pad_shifts(uuid, date, date) TO authenticated;

-- list_my_shifts
CREATE OR REPLACE FUNCTION public.list_my_shifts(
  p_from timestamptz,
  p_to timestamptz
) RETURNS SETOF public.pad_shift
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.pad_shift s
  WHERE s.company_id = public.current_company_id()
    AND (
      s.assigned_professional_id = public.current_professional_id()
      OR (
        s.status = 'open'::public.enum_pad_shift_status
        AND now() >= (s.start_at - interval '60 minutes')
        AND now() <= s.end_at
      )
    )
    AND s.start_at < p_to
    AND s.end_at > p_from
  ORDER BY s.start_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.list_my_shifts(timestamptz, timestamptz) TO authenticated;

-- get_my_active_shift
CREATE OR REPLACE FUNCTION public.get_my_active_shift()
RETURNS public.pad_shift
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.pad_shift s
  WHERE s.company_id = public.current_company_id()
    AND s.assigned_professional_id = public.current_professional_id()
    AND s.status = 'in_progress'::public.enum_pad_shift_status
  ORDER BY s.start_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_shift() TO authenticated;

-- shift_check_in
CREATE OR REPLACE FUNCTION public.shift_check_in(
  p_shift_id uuid,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
) RETURNS public.pad_shift
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.pad_shift;
  v_prof uuid := public.current_professional_id();
  v_comp uuid := public.current_company_id();
BEGIN
  IF v_prof IS NULL OR v_comp IS NULL THEN
    RAISE EXCEPTION 'Professional not linked to this user';
  END IF;

  SELECT *
  INTO v_shift
  FROM public.pad_shift
  WHERE id = p_shift_id
    AND company_id = v_comp
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF now() < (v_shift.start_at - interval '60 minutes') OR now() > v_shift.end_at THEN
    RAISE EXCEPTION 'Check-in outside allowed window';
  END IF;

  IF v_shift.status = 'assigned'::public.enum_pad_shift_status THEN
    IF v_shift.assigned_professional_id IS DISTINCT FROM v_prof THEN
      RAISE EXCEPTION 'Not allowed: shift is assigned to another professional';
    END IF;

  ELSIF v_shift.status = 'open'::public.enum_pad_shift_status THEN
    UPDATE public.pad_shift
    SET assigned_professional_id = v_prof,
        status = 'assigned'::public.enum_pad_shift_status,
        updated_at = now()
    WHERE id = v_shift.id;

    INSERT INTO public.pad_event(company_id, shift_id, type, actor_professional_id)
    VALUES (v_comp, v_shift.id, 'claim', v_prof);

  ELSE
    RAISE EXCEPTION 'Invalid shift status for check-in: %', v_shift.status;
  END IF;

  UPDATE public.pad_shift
  SET status = 'in_progress'::public.enum_pad_shift_status,
      check_in_at = COALESCE(check_in_at, now()),
      check_in_lat = p_lat,
      check_in_lng = p_lng,
      updated_at = now()
  WHERE id = v_shift.id;

  INSERT INTO public.pad_event(company_id, shift_id, type, actor_professional_id)
  VALUES (v_comp, v_shift.id, 'checkin', v_prof);

  SELECT * INTO v_shift FROM public.pad_shift WHERE id = v_shift.id;
  RETURN v_shift;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_check_in(uuid, numeric, numeric) TO authenticated;

-- shift_check_out
CREATE OR REPLACE FUNCTION public.shift_check_out(
  p_shift_id uuid,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
) RETURNS public.pad_shift
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.pad_shift;
  v_prof uuid := public.current_professional_id();
  v_comp uuid := public.current_company_id();
BEGIN
  IF v_prof IS NULL OR v_comp IS NULL THEN
    RAISE EXCEPTION 'Professional not linked to this user';
  END IF;

  SELECT *
  INTO v_shift
  FROM public.pad_shift
  WHERE id = p_shift_id
    AND company_id = v_comp
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF v_shift.assigned_professional_id IS DISTINCT FROM v_prof THEN
    RAISE EXCEPTION 'Not allowed: shift is assigned to another professional';
  END IF;

  IF v_shift.status IS DISTINCT FROM 'in_progress'::public.enum_pad_shift_status THEN
    RAISE EXCEPTION 'Invalid shift status for check-out: %', v_shift.status;
  END IF;

  UPDATE public.pad_shift
  SET status = 'finished'::public.enum_pad_shift_status,
      check_out_at = COALESCE(check_out_at, now()),
      check_out_lat = p_lat,
      check_out_lng = p_lng,
      updated_at = now()
  WHERE id = v_shift.id;

  INSERT INTO public.pad_event(company_id, shift_id, type, actor_professional_id)
  VALUES (v_comp, v_shift.id, 'checkout', v_prof);

  SELECT * INTO v_shift FROM public.pad_shift WHERE id = v_shift.id;
  RETURN v_shift;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_check_out(uuid, numeric, numeric) TO authenticated;

COMMIT;
