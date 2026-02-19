-- Relaxa a validacao de company_unit_id no PAD:
-- passa a exigir apenas que a unidade exista em company_unit.
-- O vinculo com company.company_unit_id deixa de ser obrigatorio.

CREATE OR REPLACE FUNCTION public.pad_company_integrity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_company uuid;
  v_patient uuid;
BEGIN
  IF NEW.patient_payer_id IS NOT NULL THEN
    SELECT pp.company_id, pp.patient_id
      INTO v_company, v_patient
    FROM public.patient_payer pp
    WHERE pp.id = NEW.patient_payer_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'patient_payer_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'patient_payer_id belongs to another company';
    END IF;

    IF v_patient IS DISTINCT FROM NEW.patient_id THEN
      RAISE EXCEPTION 'patient_payer_id does not belong to selected patient';
    END IF;
  END IF;

  IF NEW.company_unit_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.company_unit cu
      WHERE cu.id = NEW.company_unit_id
    ) THEN
      RAISE EXCEPTION 'company_unit_id invalid';
    END IF;
  END IF;

  IF NEW.professional_id IS NOT NULL THEN
    SELECT p.company_id
      INTO v_company
    FROM public.professional p
    WHERE p.id = NEW.professional_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'professional_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'professional_id belongs to another company';
    END IF;
  END IF;

  IF NEW.pad_service_id IS NOT NULL THEN
    SELECT ps.company_id
      INTO v_company
    FROM public.pad_service ps
    WHERE ps.id = NEW.pad_service_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'pad_service_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'pad_service_id belongs to another company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
