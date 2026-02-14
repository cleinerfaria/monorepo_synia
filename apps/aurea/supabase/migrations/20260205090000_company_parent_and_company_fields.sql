-- =====================================================
-- Company parent and additional company fields
-- =====================================================

-- Parent company (matriz) table
CREATE TABLE IF NOT EXISTS company_parent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trade_name TEXT,
    document TEXT UNIQUE,
    postal_code TEXT,
    address TEXT,
    neiborhood TEXT,
    number TEXT,
    city TEXT,
    state TEXT,
    complement TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link company to parent and add optional company fields
ALTER TABLE company
    ADD COLUMN IF NOT EXISTS company_parent_id UUID REFERENCES company_parent(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS care_modality TEXT,
    ADD COLUMN IF NOT EXISTS tax_regime TEXT,
    ADD COLUMN IF NOT EXISTS special_tax_regime TEXT,
    ADD COLUMN IF NOT EXISTS taxation_nature TEXT,
    ADD COLUMN IF NOT EXISTS cnae TEXT,
    ADD COLUMN IF NOT EXISTS cnes TEXT,
    ADD COLUMN IF NOT EXISTS state_registration TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_company_parent_id ON company(company_parent_id);

-- Updated_at trigger for company_parent
DROP TRIGGER IF EXISTS update_company_parent_updated_at ON company_parent;
CREATE TRIGGER update_company_parent_updated_at
BEFORE UPDATE ON company_parent
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for company_parent
ALTER TABLE company_parent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_parent_select_policy" ON company_parent
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_parent_insert_policy" ON company_parent
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "company_parent_update_policy" ON company_parent
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "company_parent_delete_policy" ON company_parent
    FOR DELETE USING (auth.role() = 'authenticated');
