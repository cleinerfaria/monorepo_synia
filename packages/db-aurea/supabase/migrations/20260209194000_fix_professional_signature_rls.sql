-- =====================================================
-- Fix professional signature storage policies
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
  AND name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/signature\.png$'
  AND EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id::text = split_part(name, '/', 2)
      AND pr.company_id = get_user_company_id()
  )
);

CREATE POLICY "professional_signatures_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/signature\.png$'
  AND lower(storage.extension(name)) = 'png'
  AND EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id::text = split_part(name, '/', 2)
      AND pr.company_id = get_user_company_id()
  )
);

CREATE POLICY "professional_signatures_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/signature\.png$'
  AND EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id::text = split_part(name, '/', 2)
      AND pr.company_id = get_user_company_id()
  )
)
WITH CHECK (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/signature\.png$'
  AND lower(storage.extension(name)) = 'png'
  AND EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id::text = split_part(name, '/', 2)
      AND pr.company_id = get_user_company_id()
  )
);

CREATE POLICY "professional_signatures_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'professional-signatures'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = get_user_company_id()::text
  AND name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/signature\.png$'
  AND EXISTS (
    SELECT 1
    FROM public.professional pr
    WHERE pr.id::text = split_part(name, '/', 2)
      AND pr.company_id = get_user_company_id()
  )
);
