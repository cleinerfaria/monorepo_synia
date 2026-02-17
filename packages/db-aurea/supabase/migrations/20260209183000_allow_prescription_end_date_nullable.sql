-- Migration: allow prescription.end_date to be nullable
-- Business rule: end_date may be null on prescription, but print period_end remains required.

BEGIN;

-- 1) Allow null end date on prescription
ALTER TABLE public.prescription
  ALTER COLUMN end_date DROP NOT NULL;

-- Keep period consistency when end_date is provided
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_prescription_period_range'
      AND conrelid = 'public.prescription'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.prescription DROP CONSTRAINT chk_prescription_period_range';
  END IF;
END $$;

ALTER TABLE public.prescription
  ADD CONSTRAINT chk_prescription_period_range
  CHECK (
    start_date IS NULL
    OR end_date IS NULL
    OR end_date >= start_date
  );

-- 2) Keep unique period semantics even when end_date is null
-- Old unique constraint allowed NULLs to bypass dedup logic.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescription_unique_period'
      AND conrelid = 'public.prescription'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.prescription DROP CONSTRAINT prescription_unique_period';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_prescription_unique_period_nullable'
  ) THEN
    EXECUTE 'DROP INDEX public.idx_prescription_unique_period_nullable';
  END IF;
END $$;

CREATE UNIQUE INDEX idx_prescription_unique_period_nullable
  ON public.prescription (
    company_id,
    patient_id,
    type,
    start_date,
    COALESCE(end_date, 'infinity'::date)
  );

-- 3) Update upsert RPC to handle nullable end_date
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

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'start_date obrigatorio';
  END IF;

  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
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
    AND au.active = TRUE
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
    AND p.end_date IS NOT DISTINCT FROM p_end_date
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
        AND p.end_date IS NOT DISTINCT FROM p_end_date
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

GRANT EXECUTE ON FUNCTION public.create_or_upsert_prescription(
  uuid,
  public.enum_prescription_type,
  date,
  date,
  text,
  text,
  uuid,
  text
) TO authenticated;

COMMIT;
