-- =====================================================
-- MIGRATION: 20260216170000_update_professional_schema.sql
-- DESCRIPTION: Create profession table, update professional columns to TEXT, add profession_id fk
-- =====================================================

-- 1. Create profession table
-- We assume this is a global catalog table, not tenant-specific, 
-- but if needed we could add company_id. For now, keeping it simple as requested.
CREATE TABLE IF NOT EXISTS profession (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at on profession
CREATE TRIGGER update_profession_updated_at 
BEFORE UPDATE ON profession 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Migrate existing roles from professional table to profession table
-- We use ON CONFLICT DO NOTHING to avoid duplicate errors if run multiple times or if duplicates exist
INSERT INTO profession (name)
SELECT DISTINCT role 
FROM professional 
WHERE role IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 3. Add profession_id column to professional table
ALTER TABLE professional 
ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES profession(id) ON DELETE SET NULL;

-- 4. Update profession_id in professional table based on existing role
UPDATE professional p
SET profession_id = pr.id
FROM profession pr
WHERE p.role = pr.name
  AND p.profession_id IS NULL; -- Only update if not already set

-- 5. Change professional columns from VARCHAR to TEXT
-- Per request: "alterar a professional com text em vez de varchar"
ALTER TABLE professional
    ALTER COLUMN code TYPE TEXT,
    ALTER COLUMN name TYPE TEXT,
    ALTER COLUMN role TYPE TEXT,
    ALTER COLUMN council_type TYPE TEXT,
    ALTER COLUMN council_number TYPE TEXT,
    ALTER COLUMN council_uf TYPE TEXT,
    ALTER COLUMN phone TYPE TEXT,
    ALTER COLUMN email TYPE TEXT;

-- 6. Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_professional_profession ON professional(profession_id);

-- 7. (Optional) Comment on columns
COMMENT ON COLUMN professional.profession_id IS 'Reference to the standardized profession definition';
COMMENT ON COLUMN professional.role IS 'Legacy text role, kept for backward compatibility/reference. Use profession_id.';
