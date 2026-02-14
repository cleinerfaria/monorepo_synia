-- Migration para adicionar novos campos na tabela client
-- Data: 2026-01-28
-- Adiciona campos: ans_code, tiss, color, logo_url

-- Adicionar novos campos na tabela client
ALTER TABLE public.client 
ADD COLUMN IF NOT EXISTS ans_code TEXT,
ADD COLUMN IF NOT EXISTS tiss TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Comentários para documentação dos campos
COMMENT ON COLUMN public.client.ans_code IS 'Código ANS da operadora/plano de saúde';
COMMENT ON COLUMN public.client.tiss IS 'Código TISS (Troca de Informações de Saúde Suplementar)';
COMMENT ON COLUMN public.client.color IS 'Cor associada ao cliente (hex color code)';
COMMENT ON COLUMN public.client.logo_url IS 'URL do logo do cliente';

-- Índices opcionais para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_client_ans_code ON public.client(ans_code) WHERE ans_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_tiss ON public.client(tiss) WHERE tiss IS NOT NULL;

-- Atualizar timestamp de updated_at
UPDATE public.client SET updated_at = NOW() WHERE id IS NOT NULL;