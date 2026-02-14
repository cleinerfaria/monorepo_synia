-- =====================================================
-- SYSTEM ASSETS BUCKET - Migration
-- Bucket para armazenar logos e favicons do sistema
-- =====================================================

-- =====================================================
-- CREATE BUCKET
-- =====================================================

-- Criar bucket public para assets do sistema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system_assets',
  'system_assets',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR BUCKET
-- =====================================================

-- Qualquer um pode ler (é público)
CREATE POLICY "Public Read system_assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system_assets');

-- Somente super admins podem fazer upload/update/delete
CREATE POLICY "Super admins write system_assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'system_assets' 
    AND public.is_superadmin()
  );

CREATE POLICY "Super admins update system_assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'system_assets' AND public.is_superadmin())
  WITH CHECK (bucket_id = 'system_assets' AND public.is_superadmin());

CREATE POLICY "Super admins delete system_assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'system_assets' AND public.is_superadmin());
