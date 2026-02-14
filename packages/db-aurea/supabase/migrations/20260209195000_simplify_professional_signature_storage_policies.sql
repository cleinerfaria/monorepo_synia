-- =====================================================
-- Simplify professional signature storage policies
-- Keeps tenant isolation by company_id prefix on path
-- =====================================================

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
  AND split_part(name, '/', 3) = 'signature.png'
  AND array_length(string_to_array(name, '/'), 1) = 3
);

CREATE POLICY "professional_signatures_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND split_part(name, '/', 3) = 'signature.png'
  AND array_length(string_to_array(name, '/'), 1) = 3
  AND lower(storage.extension(name)) = 'png'
);

CREATE POLICY "professional_signatures_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND split_part(name, '/', 3) = 'signature.png'
  AND array_length(string_to_array(name, '/'), 1) = 3
)
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND split_part(name, '/', 3) = 'signature.png'
  AND array_length(string_to_array(name, '/'), 1) = 3
  AND lower(storage.extension(name)) = 'png'
);

CREATE POLICY "professional_signatures_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND split_part(name, '/', 3) = 'signature.png'
  AND array_length(string_to_array(name, '/'), 1) = 3
);
