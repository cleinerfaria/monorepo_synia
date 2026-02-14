-- =====================================================
-- Professional signature storage (multi-tenant safe)
-- =====================================================

ALTER TABLE professional
ADD COLUMN IF NOT EXISTS signature_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-signatures', 'professional-signatures', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "professional_signatures_select" ON storage.objects;
DROP POLICY IF EXISTS "professional_signatures_insert" ON storage.objects;
DROP POLICY IF EXISTS "professional_signatures_update" ON storage.objects;
DROP POLICY IF EXISTS "professional_signatures_delete" ON storage.objects;

CREATE POLICY "professional_signatures_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/signature\\.png$'
);

CREATE POLICY "professional_signatures_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/signature\\.png$'
  AND lower(storage.extension(name)) = 'png'
);

CREATE POLICY "professional_signatures_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/signature\\.png$'
)
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/signature\\.png$'
  AND lower(storage.extension(name)) = 'png'
);

CREATE POLICY "professional_signatures_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/signature\\.png$'
);
