BEGIN;

-- =====================================================
-- Tabela de vínculo entre auth.users (auth.uid) e professional
-- - Não altera professional (seguro para produção)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.professional_user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- auth.uid()
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_user_pkey PRIMARY KEY (id),
  CONSTRAINT uq_professional_user_user_company UNIQUE (company_id, user_id),
  CONSTRAINT uq_professional_user_professional UNIQUE (professional_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_user_company_user
ON public.professional_user (company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_professional_user_company_professional
ON public.professional_user (company_id, professional_id);

CREATE TRIGGER update_professional_user_updated_at
BEFORE UPDATE ON public.professional_user
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
