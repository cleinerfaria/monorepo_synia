BEGIN;

-- =====================================================
-- ENUMS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_patient_attendance_shift_status') THEN
    CREATE TYPE public.enum_patient_attendance_shift_status AS ENUM (
      'planned',
      'open',
      'assigned',
      'in_progress',
      'finished',
      'missed',
      'canceled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_patient_attendance_event_type') THEN
    CREATE TYPE public.enum_patient_attendance_event_type AS ENUM (
      'claim',
      'assign',
      'unassign',
      'checkin',
      'checkout',
      'override_checkin',
      'override_checkout',
      'swap',
      'absence',
      'cover',
      'extra',
      'cancel',
      'note'
    );
  END IF;
END$$;

-- =====================================================
-- PATIENT ATTENDANCE DEMAND (PAD)
-- - Define horas/dia e horário inicial por período do paciente
-- - is_split:
--   - 24 split=false => 1 turno de 24
--   - 24 split=true  => 2 turnos de 12
--   - 12 split=true  => 2 turnos de 6
--   - 6/4 split=false sempre
-- =====================================================
CREATE TABLE IF NOT EXISTS public.patient_attendance_demand (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NULL,
  hours_per_day integer NOT NULL,
  start_time time without time zone NOT NULL,
  is_split boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_attendance_demand_pkey PRIMARY KEY (id),
  CONSTRAINT chk_pad_hours_per_day_valid CHECK (hours_per_day IN (4,6,12,24)),
  CONSTRAINT chk_pad_end_date_valid CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_pad_split_rules CHECK (
    (is_split = false AND hours_per_day IN (4,6,12,24))
    OR (is_split = true AND hours_per_day IN (12,24))
  )
);

CREATE INDEX IF NOT EXISTS idx_pad_company_patient_period
ON public.patient_attendance_demand (company_id, patient_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_pad_company_active
ON public.patient_attendance_demand (company_id, is_active);

CREATE TRIGGER update_patient_attendance_demand_updated_at
BEFORE UPDATE ON public.patient_attendance_demand
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PATIENT ATTENDANCE SHIFT
-- - Instâncias geradas a partir do PAD (escala mensal)
-- - assigned_professional_id pode ser NULL (cooperativa)
-- - check-in/out padrão definido por você
-- - closed_by/closure_note para encerramento administrativo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.patient_attendance_shift (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  patient_attendance_demand_id uuid NOT NULL REFERENCES public.patient_attendance_demand(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.enum_patient_attendance_shift_status NOT NULL DEFAULT 'planned',
  assigned_professional_id uuid NULL REFERENCES public.professional(id) ON DELETE SET NULL,
  check_in_at timestamptz NULL,
  check_out_at timestamptz NULL,
  check_in_lat numeric(10,6) NULL,
  check_in_lng numeric(10,6) NULL,
  check_out_lat numeric(10,6) NULL,
  check_out_lng numeric(10,6) NULL,
  closed_by uuid NULL REFERENCES public.professional(id) ON DELETE SET NULL,
  closure_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_attendance_shift_pkey PRIMARY KEY (id),
  CONSTRAINT chk_pas_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_pas_company_professional_time
ON public.patient_attendance_shift (company_id, assigned_professional_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_pas_company_patient_time
ON public.patient_attendance_shift (company_id, patient_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_pas_company_status_time
ON public.patient_attendance_shift (company_id, status, start_at);

CREATE INDEX IF NOT EXISTS idx_pas_company_active_shift
ON public.patient_attendance_shift (company_id, assigned_professional_id, status)
WHERE status IN ('assigned','in_progress');

CREATE TRIGGER update_patient_attendance_shift_updated_at
BEFORE UPDATE ON public.patient_attendance_shift
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PATIENT ATTENDANCE EVENT
-- - Trilho auditável de ações no plantão
-- =====================================================
CREATE TABLE IF NOT EXISTS public.patient_attendance_event (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.patient_attendance_shift(id) ON DELETE CASCADE,
  type public.enum_patient_attendance_event_type NOT NULL,
  actor_professional_id uuid NULL REFERENCES public.professional(id) ON DELETE SET NULL,
  note text NULL,
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_attendance_event_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pae_company_shift_time
ON public.patient_attendance_event (company_id, shift_id, created_at);

CREATE INDEX IF NOT EXISTS idx_pae_company_type_time
ON public.patient_attendance_event (company_id, type, created_at);

COMMIT;
