BEGIN;

-- =====================================================
-- ENUM: status da ocorrência
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_occurrence_status'
  ) THEN
    CREATE TYPE public.enum_prescription_occurrence_status AS ENUM (
      'pending',
      'done',
      'not_done',
      'canceled'
    );
  END IF;
END$$;

-- =====================================================
-- TABELA: prescription_item_occurrence
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prescription_item_occurrence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescription(id) ON DELETE CASCADE,
  prescription_item_id uuid NOT NULL REFERENCES public.prescription_item(id) ON DELETE CASCADE,

  scheduled_at timestamptz NOT NULL,
  status public.enum_prescription_occurrence_status NOT NULL DEFAULT 'pending',

  checked_by_shift_id uuid NULL,
  checked_at timestamptz NULL,
  check_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_occurrence UNIQUE (prescription_item_id, scheduled_at)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_occurrence_company_patient_time
ON public.prescription_item_occurrence (company_id, patient_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_occurrence_prescription_item
ON public.prescription_item_occurrence (prescription_item_id);

CREATE INDEX IF NOT EXISTS idx_occurrence_pending
ON public.prescription_item_occurrence (scheduled_at)
WHERE status = 'pending';

-- =====================================================
-- Trigger updated_at padrão
-- =====================================================
CREATE TRIGGER update_prescription_item_occurrence_updated_at
BEFORE UPDATE ON public.prescription_item_occurrence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
