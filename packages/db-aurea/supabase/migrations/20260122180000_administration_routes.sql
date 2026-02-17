-- =============================================
-- Vias de Administração
-- =============================================

-- Dropar tabela se existir (caso tenha sido criada parcialmente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'administration_routes'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP TABLE public.administration_routes CASCADE';
  END IF;
END $$;

CREATE TABLE administration_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, name)
);

-- Índices
CREATE INDEX idx_administration_routes_company ON administration_routes(company_id);
CREATE INDEX idx_administration_routes_active ON administration_routes(active);

-- RLS
ALTER TABLE administration_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view administration routes from their company"
  ON administration_routes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM app_user 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/managers can manage administration routes"
  ON administration_routes FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM app_user 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_administration_routes_updated_at
  BEFORE UPDATE ON administration_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
