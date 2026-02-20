-- Migration 20260209143000_deduplicate_prescription_print.sql
-- Implementação da camada de conteúdo deduplicado para impressões e reforço da regra de unicidade de prescrições por período.
-- Mantemos colunas legadas para permitir dual-read durante rollout; o drop será feito em migration posterior após validação.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END $$;

BEGIN;

-- ================================================
-- Conteúdo deduplicado
-- ================================================
CREATE TABLE IF NOT EXISTS public.print_payload_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  content_version smallint NOT NULL DEFAULT 1,
  content_hash text NOT NULL,
  patient_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes_snapshot text,
  metadata_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_payload_content IS
  'Conteúdo imutável de cabeçalho de impressão (fase A). Hash calculado pelo Postgres via digest(''v1|'' || convert_to(jsonb_strip_nulls(payload)::text, ''utf8''), ''sha256'').';
COMMENT ON COLUMN public.print_payload_content.content_hash IS
  'Hash calculado no Postgres a partir do JSONB canonicalizado; inclui content_version para suportar evoluções de schema.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_payload_content_company_hash
  ON public.print_payload_content(company_id, content_version, content_hash);
CREATE INDEX IF NOT EXISTS idx_print_payload_content_company_content_hash
  ON public.print_payload_content(company_id, content_hash);

ALTER TABLE public.print_payload_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.print_payload_content FROM PUBLIC;
GRANT SELECT, INSERT ON public.print_payload_content TO authenticated;
-- Append-only: RPC security definer com privilégios de UPDATE/DELETE fará atualizações pontuais, evitando alterações diretas pelos usuários.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'print_payload_content' AND policyname = 'Users can view print payload content') THEN
    EXECUTE 'DROP POLICY "Users can view print payload content" ON public.print_payload_content';
  END IF;
END $$;
CREATE POLICY "Users can view print payload content"
  ON public.print_payload_content
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'print_payload_content' AND policyname = 'Users can insert print payload content') THEN
    EXECUTE 'DROP POLICY "Users can insert print payload content" ON public.print_payload_content';
  END IF;
END $$;
CREATE POLICY "Users can insert print payload content"
  ON public.print_payload_content
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- Não criamos políticas de UPDATE/DELETE, reforçando o comportamento append-only e a operação via RPC security definer.

CREATE TABLE IF NOT EXISTS public.print_item_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  content_version smallint NOT NULL DEFAULT 1,
  content_hash text NOT NULL,
  description_snapshot text NOT NULL,
  route_snapshot text,
  frequency_snapshot text,
  grid_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_item_content IS
  'Conteúdo imutável dos itens impressos (fase A). Hash calculado via digest(''v1|'' || convert_to(jsonb_strip_nulls(payload)::text, ''utf8''), ''sha256'').';
COMMENT ON COLUMN public.print_item_content.grid_snapshot IS
  'Grid diário armazenado como JSONB. Mantém ordem e marcação hachurada para reimpressão.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_item_content_company_hash
  ON public.print_item_content(company_id, content_version, content_hash);
CREATE INDEX IF NOT EXISTS idx_print_item_content_company_content_hash
  ON public.print_item_content(company_id, content_hash);

ALTER TABLE public.print_item_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.print_item_content FROM PUBLIC;
GRANT SELECT, INSERT ON public.print_item_content TO authenticated;
-- Acesso append-only; updates/deletes ficam restritos a funções com segurança elevada.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'print_item_content' AND policyname = 'Users can view print item content') THEN
    EXECUTE 'DROP POLICY "Users can view print item content" ON public.print_item_content';
  END IF;
END $$;
CREATE POLICY "Users can view print item content"
  ON public.print_item_content
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'print_item_content' AND policyname = 'Users can insert print item content') THEN
    EXECUTE 'DROP POLICY "Users can insert print item content" ON public.print_item_content';
  END IF;
END $$;
CREATE POLICY "Users can insert print item content"
  ON public.print_item_content
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- UPDATE/DELETE eliminados dos policy para reforçar imutabilidade; manipulação ocorre somente via RPC security definer.

-- ================================================
-- Colunas de referência nas tabelas existentes (dual-read)
-- ================================================
ALTER TABLE public.prescription_print
  ADD COLUMN IF NOT EXISTS payload_content_id uuid REFERENCES public.print_payload_content(id) ON DELETE RESTRICT;

ALTER TABLE public.prescription_print_item
  ADD COLUMN IF NOT EXISTS item_content_id uuid REFERENCES public.print_item_content(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.prescription_print.payload_content_id IS
  'Ligação para payload deduplicado; campos patient_snapshot/notes/metadata permanecem para dual-read até validação futura.';
COMMENT ON COLUMN public.prescription_print_item.item_content_id IS
  'Referência ao conteúdo de item deduplicado; description/route/frequency/grid permanecem por enquanto.';

CREATE INDEX IF NOT EXISTS idx_print_payload_content_id
  ON public.prescription_print(payload_content_id);
CREATE INDEX IF NOT EXISTS idx_print_item_content_id
  ON public.prescription_print_item(item_content_id);

-- ================================================
-- Regra de unicidade por período
-- ================================================
-- Atualiza nulos para valores defensáveis antes de alterar colunas
UPDATE public.prescription
SET start_date = COALESCE(start_date, DATE_TRUNC('day', COALESCE(created_at, now()))::date)
WHERE start_date IS NULL;

UPDATE public.prescription
SET end_date = COALESCE(end_date, start_date)
WHERE end_date IS NULL;

-- Garantir que não existam nulos após normalização
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.prescription WHERE start_date IS NULL OR end_date IS NULL) THEN
    RAISE EXCEPTION 'prescription.start_date/ end_date ainda contém NULL; corrija manualmente antes de aplicar NOT NULL.';
  END IF;
END;
$$;

-- Garantir inexistência de duplicatas antes de criar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT company_id, patient_id, type, start_date, end_date
    FROM public.prescription
    GROUP BY company_id, patient_id, type, start_date, end_date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem prescrições duplicadas no período (company/patient/type/start/end); limpe os registros antes de aplicar a constraint.';
  END IF;
END;
$$;

ALTER TABLE public.prescription
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE public.prescription
  ADD CONSTRAINT prescription_unique_period
  UNIQUE (company_id, patient_id, type, start_date, end_date);

COMMENT ON TABLE public.prescription IS
  'Unicidade por período e tipo garantem upsert controlado; start/end agora NOT NULL.';

-- ================================================
-- Observações de rollout
-- ================================================
COMMENT ON TABLE public.prescription_print IS
  'Campos patient_snapshot/notes/metadata são legados temporários; após validação de payload_content_id, remover na segunda migration.';
COMMENT ON TABLE public.prescription_print_item IS
  'Descrição/frequência/grid permanecem até que o upsert e reimpressão usem item_content_id; futuro DROP abordará essa limpeza.';

COMMIT;
