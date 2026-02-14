BEGIN;

-- =====================================================
-- 1) ENUM public.enum_unit_scope (cria ou adiciona "scale")
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_unit_scope') THEN
    CREATE TYPE public.enum_unit_scope AS ENUM (
      'medication_base',
      'medication_prescription',
      'material_base',
      'material_prescription',
      'diet_base',
      'diet_prescription',
      'prescription_frequency',
      'procedure',
      'equipment',
      'scale'
    );
  ELSE
    -- adiciona 'scale' se ainda não existir
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_unit_scope'
        AND e.enumlabel = 'scale'
    ) THEN
      ALTER TYPE public.enum_unit_scope ADD VALUE 'scale';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2) Ajustes na tabela existente
-- =====================================================

-- 2.1) Adicionar coluna symbol se faltar
ALTER TABLE public.unit_of_measure
  ADD COLUMN IF NOT EXISTS symbol TEXT;

-- Preencher symbol se estiver NULL (fallback: upper(code))
UPDATE public.unit_of_measure
SET symbol = COALESCE(symbol, upper(code))
WHERE symbol IS NULL;

-- Tornar symbol NOT NULL (sem quebrar)
ALTER TABLE public.unit_of_measure
  ALTER COLUMN symbol SET NOT NULL;

-- 2.2) Garantir company_id NOT NULL (você disse que já ajustou tudo)
ALTER TABLE public.unit_of_measure
  ALTER COLUMN company_id SET NOT NULL;

-- 2.3) Remover is_system (se existir) + remover policies antigas antes
-- (evita erro de dependência)
DROP POLICY IF EXISTS unit_of_measure_update_policy ON public.unit_of_measure;
DROP POLICY IF EXISTS unit_of_measure_delete_policy ON public.unit_of_measure;
DROP POLICY IF EXISTS unit_of_measure_insert_policy ON public.unit_of_measure;
DROP POLICY IF EXISTS unit_of_measure_select_policy ON public.unit_of_measure;

ALTER TABLE public.unit_of_measure
  DROP COLUMN IF EXISTS is_system;

-- 2.4) Remover colunas antigas de domínio/contexto (se existirem)
ALTER TABLE public.unit_of_measure
  DROP COLUMN IF EXISTS allowed_domains;

ALTER TABLE public.unit_of_measure
  DROP COLUMN IF EXISTS allowed_contexts;

-- 2.5) Adicionar allowed_scopes (se faltar)
ALTER TABLE public.unit_of_measure
  ADD COLUMN IF NOT EXISTS allowed_scopes public.enum_unit_scope[];

-- Se estiver NULL, inicia como array vazio (para evitar NULLs)
UPDATE public.unit_of_measure
SET allowed_scopes = COALESCE(allowed_scopes, ARRAY[]::public.enum_unit_scope[])
WHERE allowed_scopes IS NULL;

-- Tornar NOT NULL
ALTER TABLE public.unit_of_measure
  ALTER COLUMN allowed_scopes SET NOT NULL;

-- =====================================================
-- 3) Constraints / índices (padrão novo)
-- =====================================================

-- Unique por empresa + code (remove a antiga se tiver nome diferente)
DO $$
BEGIN
  -- cria constraint única se não existir com esse nome
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unit_of_measure_company_code_unique'
      AND conrelid = 'public.unit_of_measure'::regclass
  ) THEN
    -- tenta remover constraint antiga (caso exista com outro nome)
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.unit_of_measure'::regclass
        AND contype = 'u'
    ) THEN
      -- não derruba todas: apenas a que bate (company_id, code)
      -- se você tiver outras uniques, não mexe
      NULL;
    END IF;

    ALTER TABLE public.unit_of_measure
      ADD CONSTRAINT unit_of_measure_company_code_unique UNIQUE (company_id, code);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company
ON public.unit_of_measure(company_id);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company_code
ON public.unit_of_measure(company_id, code);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company_active
ON public.unit_of_measure(company_id, active);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_allowed_scopes_gin
ON public.unit_of_measure
USING GIN (allowed_scopes);

-- =====================================================
-- 4) RLS (recriar sem is_system)
-- =====================================================
ALTER TABLE public.unit_of_measure ENABLE ROW LEVEL SECURITY;

CREATE POLICY unit_of_measure_select_policy
ON public.unit_of_measure
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.app_user
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY unit_of_measure_insert_policy
ON public.unit_of_measure
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.app_user
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY unit_of_measure_update_policy
ON public.unit_of_measure
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.app_user
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.app_user
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY unit_of_measure_delete_policy
ON public.unit_of_measure
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.app_user
    WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- 5) FKs em product (se ainda não existirem)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_unit_stock_id_fkey') THEN
    ALTER TABLE public.product
      ADD CONSTRAINT product_unit_stock_id_fkey
      FOREIGN KEY (unit_stock_id) REFERENCES public.unit_of_measure(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_unit_prescription_id_fkey') THEN
    ALTER TABLE public.product
      ADD CONSTRAINT product_unit_prescription_id_fkey
      FOREIGN KEY (unit_prescription_id) REFERENCES public.unit_of_measure(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 6) SEED (company via document) + regras "pode tudo menos..."
-- =====================================================

WITH c AS (
  SELECT id AS company_id
  FROM public.company
  WHERE document = '04.947.934/0001-96'
  LIMIT 1
),
seed AS (
  SELECT *
  FROM (VALUES
    ('un',     'Unidade',        'UN',   'Unidade individual'),
    ('cx',     'Caixa',          'CX',   'Caixa contendo múltiplas unidades'),
    ('fr',     'Frasco',         'FR',   'Frasco (líquido/sólido)'),
    ('amp',    'Ampola',         'AMP',  'Ampola para injetáveis'),
    ('fa',     'Frasco-Ampola',  'FA',   'Frasco-ampola para injetáveis'),
    ('cp',     'Comprimido',     'CP',   'Comprimido individual'),
    ('cap',    'Cápsula',        'CAP',  'Cápsula individual'),
    ('bl',     'Blister',        'BL',   'Blister/cartela de doses'),
    ('tb',     'Tubo',           'TB',   'Tubo de pomada/gel'),
    ('bisn',   'Bisnaga',        'BISN', 'Bisnaga de produto'),

    ('pct',    'Pacote',         'PCT',  'Pacote contendo múltiplas unidades'),
    ('rl',     'Rolo',           'RL',   'Rolo de material'),
    ('kit',    'Kit',            'KIT',  'Kit com múltiplos itens'),
    ('par',    'Par',            'PAR',  'Par de itens (ex.: luvas)'),

    ('sess',   'Sessão',         'SESS', 'Sessão/atendimento (procedimento)'),
    ('visit',  'Visita',         'VIS',  'Visita (procedimento)'),
    ('dia',    'Dia',            'DIA',  'Diária (equipamento/serviço)'),

    ('ml',     'Mililitro',      'mL',   'Volume em mililitros'),
    ('l',      'Litro',          'L',    'Volume em litros'),
    ('mg',     'Miligrama',      'mg',   'Massa em miligramas'),
    ('g',      'Grama',          'g',    'Massa em gramas'),
    ('gota',   'Gota',           'gota', 'Gota (dose)'),
    ('dose',   'Dose',           'dose', 'Dose unitária'),

    ('minuto', 'Minuto',         'min',  'Unidade de tempo (minuto)'),
    ('hora',   'Hora',           'h',    'Unidade de tempo (hora)'),
    ('semana', 'Semana',         'sem',  'Unidade de tempo (semana)'),
    ('mes',    'Mês',            'mês',  'Unidade de tempo (mês)'),
    ('plantao','Plantão',        'pl',   'Plantão (turno/escala)')
  ) AS t(code, name, symbol, description)
),
scoped AS (
  SELECT
    s.*,
    ARRAY_REMOVE(ARRAY[
      -- medicamento base: tudo menos ml, mg, gota, dose
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose') THEN 'medication_base'::public.enum_unit_scope END,

      -- medicamento prescrição: tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb') THEN 'medication_prescription'::public.enum_unit_scope END,

      -- material base: tudo menos ml, mg, gota, dose, cp, drg, fa, amp
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose','cp','drg','fa','amp') THEN 'material_base'::public.enum_unit_scope END,

      -- material prescrição: tudo menos cp, drg, fa, amp
      CASE WHEN s.code NOT IN ('cp','drg','fa','amp') THEN 'material_prescription'::public.enum_unit_scope END,

      -- dieta base: tudo menos ml, mg, gota, blister e dose
      CASE WHEN s.code NOT IN ('ml','mg','gota','bl','dose') THEN 'diet_base'::public.enum_unit_scope END,

      -- dieta prescrição: tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb') THEN 'diet_prescription'::public.enum_unit_scope END,

      -- procedimento: apenas sessão, visita, hora, plantão
      CASE WHEN s.code IN ('sess','visit','hora','plantao') THEN 'procedure'::public.enum_unit_scope END,

      -- equipamento: minuto, hora, dia, semana, mês
      CASE WHEN s.code IN ('minuto','hora','dia','semana','mes') THEN 'equipment'::public.enum_unit_scope END,

      -- escala: hora, dia, plantão
      CASE WHEN s.code IN ('hora','dia','plantao') THEN 'scale'::public.enum_unit_scope END
    ], NULL) AS allowed_scopes
  FROM seed s
)
INSERT INTO public.unit_of_measure (
  company_id,
  code,
  name,
  symbol,
  description,
  allowed_scopes,
  active
)
SELECT
  c.company_id,
  sc.code,
  sc.name,
  sc.symbol,
  sc.description,
  sc.allowed_scopes,
  TRUE
FROM c
JOIN scoped sc ON TRUE
WHERE array_length(sc.allowed_scopes, 1) IS NOT NULL
ON CONFLICT (company_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  description = EXCLUDED.description,
  allowed_scopes = EXCLUDED.allowed_scopes,
  active = EXCLUDED.active;

COMMIT;
