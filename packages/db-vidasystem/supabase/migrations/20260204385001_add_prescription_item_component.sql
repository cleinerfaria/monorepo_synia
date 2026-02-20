-- ============================================================
-- MIGRATION: Prescription type + Item supplier + Components
-- ============================================================

-- ============================================================
-- 1) ENUM: prescription_type (medical/nursing/nutrition)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_prescription_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.enum_prescription_type AS ENUM ('medical', 'nursing', 'nutrition');
  END IF;
END $$;

-- Adiciona coluna em prescription
ALTER TABLE public.prescription
ADD COLUMN IF NOT EXISTS type public.enum_prescription_type;

COMMENT ON COLUMN public.prescription.type IS
'Tipo da prescrição: medical (médica), nursing (enfermagem) ou nutrition (nutrição).';

-- Índice útil para filtros por tipo dentro da empresa
CREATE INDEX IF NOT EXISTS idx_prescription_company_type
ON public.prescription (company_id, type);

-- ============================================================
-- 2) ENUM: prescription_item_supplier (company/family/government/other)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_prescription_item_supplier'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.enum_prescription_item_supplier AS ENUM ('company', 'family', 'government', 'other');
  END IF;
END $$;

-- Adiciona coluna supplier em prescription_item
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS supplier public.enum_prescription_item_supplier;

COMMENT ON COLUMN public.prescription_item.supplier IS
'Fornecedor/origem do item: company (empresa), family (família), government (governo), other (outros).';


-- ============================================================
-- 3) TABELA: prescription_item_component (itens associados ao item)
--    Ex: Nebulização (item principal) -> soro, atrovent, berotec
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prescription_item_component (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  prescription_item_id uuid NOT NULL,

  -- Alvo do componente (normalmente um produto/medicação/material/dieta)
  product_id uuid NULL,

  -- Dose/quantidade do componente (pode ser ml, gts, etc. - o rótulo fica no front)
  quantity numeric(10,3) NULL,

  created_at timestamptz NULL DEFAULT now(),
  updated_at timestamptz NULL DEFAULT now(),

  CONSTRAINT prescription_item_component_pkey PRIMARY KEY (id),

  CONSTRAINT prescription_item_component_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE,

  CONSTRAINT prescription_item_component_prescription_item_id_fkey
    FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_item(id) ON DELETE CASCADE,

  CONSTRAINT prescription_item_component_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.prescription_item_component IS
'Componentes/itens associados a um item de prescrição (ex: nebulização com soro/medicações).';

COMMENT ON COLUMN public.prescription_item_component.prescription_item_id IS
'Item principal da prescrição ao qual este componente pertence.';




CREATE TRIGGER update_prescription_item_component_updated_at
BEFORE UPDATE ON public.prescription_item_component
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4) (Opcional, mas recomendado) Integridade: company_id consistente
--    Garante que component.company_id = parent_item.company_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_prescription_item_component_company_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT pi.company_id
    INTO v_company_id
  FROM public.prescription_item pi
  WHERE pi.id = NEW.prescription_item_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'prescription_item_id inválido: %', NEW.prescription_item_id;
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'company_id do componente (%) difere do item pai (%)', NEW.company_id, v_company_id;
  END IF;

  RETURN NEW;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'prescription_item_component_company_guard'
      AND t.tgrelid = 'public.prescription_item_component'::regclass
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE 'DROP TRIGGER prescription_item_component_company_guard ON public.prescription_item_component';
  END IF;
END $$;

CREATE TRIGGER prescription_item_component_company_guard
BEFORE INSERT OR UPDATE ON public.prescription_item_component
FOR EACH ROW
EXECUTE FUNCTION public.trg_prescription_item_component_company_guard();
