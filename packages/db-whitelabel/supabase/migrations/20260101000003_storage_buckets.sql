-- =====================================================
-- BASE MULTI-TENANT (GENÉRICA) - Migration 03
-- Storage Buckets + Policies (isolamento por prefixo no path)
-- Buckets:
-- - company-logos (público: leitura liberada)
-- - user-avatars (privado: leitura/escrita restrita ao tenant)
-- Regras:
-- - company-logos: leitura pública; escrita apenas no prefixo "{company_id}/"
-- - user-avatars: leitura só do tenant; escrita só do próprio usuário em "{company_id}/{auth_user_id}/"
-- =====================================================

-- =====================================================
-- 1) BUCKETS
-- =====================================================

-- Logo da empresa (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar/logo do usuário (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2) POLICIES (IDEMPOTENTE)
-- Policies ficam em storage.objects
-- =====================================================

-- COMPANY LOGOS
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;

-- USER AVATARS
DROP POLICY IF EXISTS "Tenant can view user avatars" ON storage.objects;
DROP POLICY IF EXISTS "User can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "User can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "User can delete own avatar" ON storage.objects;

-- =====================================================
-- 3) COMPANY LOGOS (bucket público)
-- Path esperado: "{company_id}/<arquivo>"
-- =====================================================

-- Leitura pública (anon + authenticated)
CREATE POLICY "Public can view company logos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'company-logos');

-- Upload: somente autenticado e dentro do próprio company_id
CREATE POLICY "Users can upload company logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name LIKE (public.get_user_company_id()::text || '/%')
  );

-- Update: somente dentro do próprio company_id
CREATE POLICY "Users can update company logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name LIKE (public.get_user_company_id()::text || '/%')
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name LIKE (public.get_user_company_id()::text || '/%')
  );

-- Delete: somente dentro do próprio company_id
CREATE POLICY "Users can delete company logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name LIKE (public.get_user_company_id()::text || '/%')
  );

-- =====================================================
-- 4) USER AVATARS (bucket privado)
-- Path esperado: "{company_id}/{auth_user_id}/<arquivo>"
-- =====================================================

-- SELECT: qualquer usuário autenticado do tenant pode ver avatares do próprio tenant
CREATE POLICY "Tenant can view user avatars"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND name LIKE (public.get_user_company_id()::text || '/%')
  );

-- INSERT: somente o próprio usuário pode gravar em "{company_id}/{auth_user_id}/"
CREATE POLICY "User can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND name LIKE (public.get_user_company_id()::text || '/' || auth.uid()::text || '/%')
  );

-- UPDATE: somente o próprio usuário dentro do seu prefixo
CREATE POLICY "User can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND name LIKE (public.get_user_company_id()::text || '/' || auth.uid()::text || '/%')
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND name LIKE (public.get_user_company_id()::text || '/' || auth.uid()::text || '/%')
  );

-- DELETE: somente o próprio usuário dentro do seu prefixo
CREATE POLICY "User can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND name LIKE (public.get_user_company_id()::text || '/' || auth.uid()::text || '/%')
  );
