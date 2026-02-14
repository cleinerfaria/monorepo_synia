BEGIN;

-- =====================================================
-- ENUM: enum_prescription_occurrence_status
-- Representa o estado da execução da ocorrência
-- pending   -> ainda não realizada
-- done      -> realizada
-- not_done  -> não realizada (com justificativa)
-- canceled  -> removida após mudança da prescrição
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

COMMENT ON TYPE public.enum_prescription_occurrence_status IS
'Status de cada ocorrência gerada a partir de um item da prescrição';

-- =====================================================
-- TABELA: prescription_item_occurrence
-- Cada registro representa uma execução programada
-- (dose, procedimento ou ação) de um item da prescrição
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prescription_item_occurrence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescription(id) ON DELETE CASCADE,
  prescription_item_id uuid NOT NULL REFERENCES public.prescription_item(id) ON DELETE CASCADE,

  -- Momento planejado da execução
  scheduled_at timestamptz NOT NULL,

  -- Estado atual da ocorrência
  status public.enum_prescription_occurrence_status NOT NULL DEFAULT 'pending',

  -- Plantão responsável pela checagem
  checked_by_shift_id uuid NULL,

  -- Momento real da checagem
  checked_at timestamptz NULL,

  -- Referência ao registro detalhado da administração
  check_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Garante que não exista duplicidade de horário para o mesmo item
  CONSTRAINT uq_occurrence UNIQUE (prescription_item_id, scheduled_at)
);

-- Comentários da tabela
COMMENT ON TABLE public.prescription_item_occurrence IS
'Ocorrências geradas automaticamente a partir dos itens da prescrição para formar o checklist assistencial';

COMMENT ON COLUMN public.prescription_item_occurrence.scheduled_at IS
'Horário planejado da execução da dose/procedimento';

COMMENT ON COLUMN public.prescription_item_occurrence.checked_by_shift_id IS
'Plantão (patient_attendance_shift) responsável pela execução';

COMMENT ON COLUMN public.prescription_item_occurrence.checked_at IS
'Momento real em que a ocorrência foi executada';

COMMENT ON COLUMN public.prescription_item_occurrence.check_id IS
'Referência ao registro detalhado da checagem (patient_med_admin)';

-- =====================================================
-- ÍNDICES (performance da tela do técnico)
-- =====================================================

-- Lista do dia do paciente
CREATE INDEX IF NOT EXISTS idx_occurrence_company_patient_time
ON public.prescription_item_occurrence (company_id, patient_id, scheduled_at);

COMMENT ON INDEX idx_occurrence_company_patient_time IS
'Otimiza carregamento da tela diária do paciente';

-- Busca por item
CREATE INDEX IF NOT EXISTS idx_occurrence_prescription_item
ON public.prescription_item_occurrence (prescription_item_id);

-- Ocorrências pendentes (fila de trabalho)
CREATE INDEX IF NOT EXISTS idx_occurrence_pending
ON public.prescription_item_occurrence (scheduled_at)
WHERE status = 'pending';

COMMENT ON INDEX idx_occurrence_pending IS
'Usado para localizar rapidamente tarefas pendentes';

-- =====================================================
-- Trigger updated_at padrão
-- =====================================================
CREATE TRIGGER update_prescription_item_occurrence_updated_at
BEFORE UPDATE ON public.prescription_item_occurrence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
