-- =====================================================
-- MIGRATION: 20260216170000_update_professional_schema.sql
-- DESCRIPTION: Create profession table (with RLS), update professional columns to TEXT, add profession_id fk
-- =====================================================

-- 1. Create profession table
-- Now including company_id for multi-tenancy.
CREATE TABLE IF NOT EXISTS profession (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Trigger for updated_at on profession
CREATE TRIGGER update_profession_updated_at 
BEFORE UPDATE ON profession 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Enable RLS and add policies
ALTER TABLE profession ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profession_company ON profession(company_id);

CREATE POLICY "Users can view professions in their company"
    ON profession FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert professions in their company"
    ON profession FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update professions in their company"
    ON profession FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete professions in their company"
    ON profession FOR DELETE
    USING (company_id = get_user_company_id());

-- 3. Add profession_id column to professional table
ALTER TABLE professional 
ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES profession(id) ON DELETE SET NULL;

-- 4. Change professional columns from VARCHAR to TEXT and DROP ROLE
ALTER TABLE professional
    ALTER COLUMN code TYPE TEXT,
    ALTER COLUMN name TYPE TEXT,
    ALTER COLUMN council_type TYPE TEXT,
    ALTER COLUMN council_number TYPE TEXT,
    ALTER COLUMN council_uf TYPE TEXT,
    ALTER COLUMN phone TYPE TEXT,
    ALTER COLUMN email TYPE TEXT;

-- Drop role column as requested ("ajuste para excluir a coluna role")
-- We do this carefully: if it exists, drop it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional' AND column_name = 'role') THEN
        ALTER TABLE professional DROP COLUMN role;
    END IF;
END $$;

-- 5. Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_professional_profession ON professional(profession_id);

-- 6. Comment on columns
COMMENT ON COLUMN professional.profession_id IS 'Reference to the standardized profession definition';
