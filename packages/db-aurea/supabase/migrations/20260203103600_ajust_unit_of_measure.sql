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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unit_of_measure'
      AND column_name = 'symbol'
  ) THEN
    EXECUTE 'ALTER TABLE public.unit_of_measure ADD COLUMN symbol TEXT';
  END IF;
END $$;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unit_of_measure'
      AND column_name = 'is_system'
  ) THEN
    EXECUTE 'ALTER TABLE public.unit_of_measure DROP COLUMN is_system';
  END IF;
END $$;

-- 2.4) Remover colunas antigas de domínio/contexto (se existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unit_of_measure'
      AND column_name = 'allowed_domains'
  ) THEN
    EXECUTE 'ALTER TABLE public.unit_of_measure DROP COLUMN allowed_domains';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unit_of_measure'
      AND column_name = 'allowed_contexts'
  ) THEN
    EXECUTE 'ALTER TABLE public.unit_of_measure DROP COLUMN allowed_contexts';
  END IF;
END $$;

-- 2.5) Adicionar allowed_scopes (se faltar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unit_of_measure'
      AND column_name = 'allowed_scopes'
  ) THEN
    EXECUTE 'ALTER TABLE public.unit_of_measure ADD COLUMN allowed_scopes public.enum_unit_scope[]';
  END IF;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_unit_of_measure_company'
  ) THEN
    EXECUTE 'CREATE INDEX idx_unit_of_measure_company ON public.unit_of_measure(company_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_unit_of_measure_company_code'
  ) THEN
    EXECUTE 'CREATE INDEX idx_unit_of_measure_company_code ON public.unit_of_measure(company_id, code)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_unit_of_measure_company_active'
  ) THEN
    EXECUTE 'CREATE INDEX idx_unit_of_measure_company_active ON public.unit_of_measure(company_id, is_active)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_unit_of_measure_allowed_scopes_gin'
  ) THEN
    EXECUTE 'CREATE INDEX idx_unit_of_measure_allowed_scopes_gin ON public.unit_of_measure USING GIN (allowed_scopes)';
  END IF;
END $$;

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
  WHERE document = '00.000.000/0001-00'
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
    ('lata',   'Lata',           'LATA', 'Lata de medicamento ou material'),
    ('ml',     'Mililitro',      'ML',   'Volume em mililitros'),
    ('cm',     'Centímetro',     'CM',   'Comprimento em centímetros'),
    ('mt',      'Metro',         'MT',    'Comprimento em metros'),
    ('lt',     'Litro',          'LT',   'Volume em litros'),
    ('kg',     'Quilograma',     'KG',   'Massa em quilogramas'),
    ('mg',     'Miligrama',      'MG',   'Massa em miligramas'),
    ('ser',    'Seringa',        'SER',  'Seringa para injetáveis'),
    ('g',      'Grama',          'G',    'Massa em gramas'),
    ('gota',   'Gota',           'GOTA', 'Gota (dose)'),
    ('dose',   'Dose',           'DOSE', 'Dose unitária'),
    ('sache',  'Sachê',          'SACH', 'Gel/líquido monodose'),
    ('drg',    'Drágea',         'DRG',  'Drágea (comprimido revestido)'),
    ('env',    'Envelope',       'ENV',  'Envelope pó/granulado para diluição'),
    ('flac',   'Flaconete',      'FLAC', 'Flaconete para líquidos'),
    ('bolsa',  'Bolsa',          'BOLS', 'Bolsa para líquidos'),
    ('ades',   'Adesivo',        'ADES', 'Unidade de medida para medicamentos por adesivo'),
    ('minuto', 'Minuto',         'MIN',  'Unidade de tempo (minuto)'),
    ('hora',   'Hora',           'H',    'Unidade de tempo (hora)'),
    ('semana', 'Semana',         'SEM',  'Unidade de tempo (semana)'),
    ('mes',    'Mês',            'MÊS',  'Unidade de tempo (mês)'),
    ('plantao','Plantão',        'PL',   'Plantão (turno/escala)')
  ) AS t(code, name, symbol, description)
),
scoped AS (
  SELECT
    s.*,
    ARRAY_REMOVE(ARRAY[
      -- medicamento base: tudo menos ml, mg, gota, dose, cm, mt
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose','cm','mt') THEN 'medication_base'::public.enum_unit_scope END,

      -- medicamento prescrição: tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb') THEN 'medication_prescription'::public.enum_unit_scope END,

      -- material base: tudo menos ml, mg, gota, dose, cp, drg, fa, amp
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose','cp','drg','fa','amp') THEN 'material_base'::public.enum_unit_scope END,

      -- material prescrição: tudo menos cp, drg, fa, amp
      CASE WHEN s.code NOT IN ('cp','drg','fa','amp') THEN 'material_prescription'::public.enum_unit_scope END,

      -- dieta base: tudo menos ml, mg, gota, blister e dose
      CASE WHEN s.code NOT IN ('ml','mg','gota','bl','dose','cm','mt') THEN 'diet_base'::public.enum_unit_scope END,

      -- dieta prescrição: tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb','cm','mt') THEN 'diet_prescription'::public.enum_unit_scope END,

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
  is_active
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
  is_active = EXCLUDED.is_active;

COMMIT;
