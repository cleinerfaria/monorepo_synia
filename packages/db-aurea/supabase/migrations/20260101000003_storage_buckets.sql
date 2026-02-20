-- =====================================================
-- VidaSystem - Storage Buckets Configuration
-- =====================================================

-- Criar bucket para logos das empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para anexos de prescrições
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para XMLs de NFe
INSERT INTO storage.buckets (id, name, public)
VALUES ('nfe-xml', 'nfe-xml', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POLÍTICAS DE STORAGE - COMPANY LOGOS
-- =====================================================

-- Qualquer um pode ver logos (bucket público)
CREATE POLICY "Public can view company logos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'company-logos');

-- Usuários autenticados podem fazer upload de logos da sua empresa
CREATE POLICY "Users can upload company logos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'company-logos' 
        AND auth.role() = 'authenticated'
    );

-- Usuários podem atualizar logos da sua empresa
CREATE POLICY "Users can update company logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Usuários podem deletar logos da sua empresa
CREATE POLICY "Users can delete company logos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS DE STORAGE - PRESCRIÇÕES
-- =====================================================

-- Usuários autenticados podem ver arquivos de prescrição
CREATE POLICY "Authenticated users can view prescriptions"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Usuários autenticados podem fazer upload de prescrições
CREATE POLICY "Users can upload prescriptions"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Usuários podem atualizar arquivos de prescrição
CREATE POLICY "Users can update prescriptions"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'prescriptions' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Usuários podem deletar arquivos de prescrição
CREATE POLICY "Users can delete prescriptions"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS DE STORAGE - NFe XML
-- =====================================================

-- Usuários autenticados podem ver XMLs de NFe
CREATE POLICY "Authenticated users can view NFe XML"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'nfe-xml' AND auth.role() = 'authenticated');

-- Usuários autenticados podem fazer upload de XMLs de NFe
CREATE POLICY "Users can upload NFe XML"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'nfe-xml' AND auth.role() = 'authenticated');

-- Usuários podem atualizar XMLs de NFe
CREATE POLICY "Users can update NFe XML"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'nfe-xml' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'nfe-xml' AND auth.role() = 'authenticated');

-- Usuários podem deletar XMLs de NFe
CREATE POLICY "Users can delete NFe XML"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'nfe-xml' AND auth.role() = 'authenticated');
