
-- =====================================================
-- PAD service catalog per company
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pad_service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pad_service_company_code
  ON public.pad_service (company_id, lower(code));

CREATE UNIQUE INDEX IF NOT EXISTS ux_pad_service_company_name
  ON public.pad_service (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_pad_service_company_active
  ON public.pad_service (company_id, is_active, sort_order, name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_pad_service_updated_at'
      AND tgrelid = 'public.pad_service'::regclass
  ) THEN
    CREATE TRIGGER update_pad_service_updated_at
      BEFORE UPDATE ON public.pad_service
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.pad_service ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pad_service_select_policy" ON public.pad_service
  FOR SELECT
  USING (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY "pad_service_insert_policy" ON public.pad_service
  FOR INSERT
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY "pad_service_update_policy" ON public.pad_service
  FOR UPDATE
  USING (company_id = (SELECT public.get_user_company_id()))
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY "pad_service_delete_policy" ON public.pad_service
  FOR DELETE
  USING (company_id = (SELECT public.get_user_company_id()));

-- =====================================================
-- Seed default PAD services for existing companies
-- =====================================================
INSERT INTO public.pad_service (company_id, code, name, description, sort_order, is_active)
SELECT c.id, s.code, s.name, s.description, s.sort_order, true
FROM public.company c
CROSS JOIN (
  VALUES
    ('internacao_domiciliar', 'Internacao Domiciliar', 'Atendimento continuo em domicilio', 1),
    ('atendimento_domiciliar', 'Atendimento Domiciliar', 'Visitas e acompanhamentos em domicilio', 2),
    ('infusao', 'Infusao', 'Terapias infusionais', 3),
    ('transporte', 'Transporte', 'Transporte assistido do paciente', 4),
    ('outros', 'Outros', 'Demais modalidades de assistencia', 5)
) AS s(code, name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pad_service ps
  WHERE ps.company_id = c.id
    AND lower(ps.code) = lower(s.code)
);

-- =====================================================
-- PAD: new business fields
-- =====================================================
ALTER TABLE public.pad
  ADD COLUMN IF NOT EXISTS patient_payer_id uuid NULL REFERENCES public.patient_payer(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_unit_id uuid NULL REFERENCES public.company_unit(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS professional_id uuid NULL REFERENCES public.professional(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pad_service_id uuid NULL REFERENCES public.pad_service(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS end_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_pad_patient_payer_id ON public.pad (patient_payer_id);
CREATE INDEX IF NOT EXISTS idx_pad_company_unit_id ON public.pad (company_unit_id);
CREATE INDEX IF NOT EXISTS idx_pad_professional_id ON public.pad (professional_id);
CREATE INDEX IF NOT EXISTS idx_pad_service_id ON public.pad (pad_service_id);
CREATE INDEX IF NOT EXISTS idx_pad_start_at ON public.pad (start_at);
CREATE INDEX IF NOT EXISTS idx_pad_end_at ON public.pad (end_at);


ALTER TABLE public.pad
  ADD CONSTRAINT chk_pad_start_end_at_valid CHECK (
    end_at IS NULL OR start_at IS NULL OR end_at > start_at
  );

-- =====================================================
-- Guard cross-tenant references in PAD
-- =====================================================
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
      FROM public.company c
      WHERE c.id = NEW.company_id
        AND c.company_unit_id = NEW.company_unit_id
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'pad_company_integrity_guard'
      AND tgrelid = 'public.pad'::regclass
  ) THEN
    CREATE TRIGGER pad_company_integrity_guard
      BEFORE INSERT OR UPDATE OF company_id, patient_id, patient_payer_id, company_unit_id, professional_id, pad_service_id
      ON public.pad
      FOR EACH ROW EXECUTE FUNCTION public.pad_company_integrity_guard();
  END IF;
END $$;
