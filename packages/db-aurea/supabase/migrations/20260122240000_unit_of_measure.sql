-- =============================================
-- UNIT OF MEASURE + RLS + SEED (escopo granular)
-- =============================================
-- 1) ENUMs (prefixo enum_)

CREATE TYPE public.enum_unit_scope AS ENUM (
  'medication_base',
  'medication_prescription',
  'material_base',
  'material_prescription',
  'diet_base',
  'diet_prescription',
  'procedure',
  'equipment',
  'scale'
);

-- 2) Tabela
CREATE TABLE IF NOT EXISTS public.unit_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT NULL,

  allowed_scopes public.enum_unit_scope[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unit_of_measure_company_code_unique UNIQUE (company_id, code),
  CONSTRAINT chk_unit_of_measure_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT chk_unit_of_measure_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT chk_unit_of_measure_symbol_not_blank CHECK (btrim(symbol) <> '')
);

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company
ON public.unit_of_measure(company_id);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company_code
ON public.unit_of_measure(company_id, code);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_company_active
ON public.unit_of_measure(company_id, active);

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_allowed_scopes_gin
ON public.unit_of_measure
USING GIN (allowed_scopes);

-- 4) RLS
ALTER TABLE public.unit_of_measure ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_of_measure'
      AND policyname = 'unit_of_measure_select_policy'
  ) THEN
    EXECUTE 'DROP POLICY unit_of_measure_select_policy ON public.unit_of_measure';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_of_measure'
      AND policyname = 'unit_of_measure_insert_policy'
  ) THEN
    EXECUTE 'DROP POLICY unit_of_measure_insert_policy ON public.unit_of_measure';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_of_measure'
      AND policyname = 'unit_of_measure_update_policy'
  ) THEN
    EXECUTE 'DROP POLICY unit_of_measure_update_policy ON public.unit_of_measure';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unit_of_measure'
      AND policyname = 'unit_of_measure_delete_policy'
  ) THEN
    EXECUTE 'DROP POLICY unit_of_measure_delete_policy ON public.unit_of_measure';
  END IF;
END $$;

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

-- 5) FKs em product (se não existirem)
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

-- =============================================
-- 6) SEED: todas as unidades + aplicação dos escopos
-- (lookup por company.document = opção 1)
-- =============================================

WITH c AS (
  SELECT id AS company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1
),
seed AS (
  SELECT *
  FROM (VALUES
    -- =========================
    -- LISTA BASE (sua lista)
    -- =========================
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

    -- Aplicação dos escopos conforme suas regras ("pode tudo menos..."):
    ARRAY_REMOVE(ARRAY[
      -- medicamento base: pode tudo menos ml, mg, gota e dose
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose') THEN 'medication_base'::public.enum_unit_scope END,

      -- medicamento prescrição: pode tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb') THEN 'medication_prescription'::public.enum_unit_scope END,

      -- material base: pode tudo menos ml, mg, gota, dose, comprimido, dragea, frasco_ampola, ampola
      CASE WHEN s.code NOT IN ('ml','mg','gota','dose','cp','drg','fa','amp') THEN 'material_base'::public.enum_unit_scope END,

      -- material prescrição: pode tudo menos comprimido, dragea, frasco_ampola, ampola
      CASE WHEN s.code NOT IN ('cp','drg','fa','amp') THEN 'material_prescription'::public.enum_unit_scope END,

      -- dieta base: pode tudo menos ml, mg, gota, blister e dose
      CASE WHEN s.code NOT IN ('ml','mg','gota','bl','dose') THEN 'diet_base'::public.enum_unit_scope END,

      -- dieta prescrição: pode tudo menos blister e tubo
      CASE WHEN s.code NOT IN ('bl','tb') THEN 'diet_prescription'::public.enum_unit_scope END,

      -- procedimento: apenas sessão, visita, hora, plantao (e não “tudo”)
      CASE WHEN s.code IN ('sess','visit','hora','plantao') THEN 'procedure'::public.enum_unit_scope END,

      -- equipamento: minuto, hora, dia, semana, mês
      CASE WHEN s.code IN ('minuto','hora','dia','semana','mes') THEN 'equipment'::public.enum_unit_scope END,

      -- escala: hora, dia, plantao
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
