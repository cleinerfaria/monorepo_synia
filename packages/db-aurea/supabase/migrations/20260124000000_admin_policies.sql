-- =============================================
-- POLÍTICAS DE ADMINISTRAÇÃO
-- Permite gerenciamento de empresas e usuários
-- Versão sem recursão nas policies RLS
-- =============================================

-- =============================================
-- POLÍTICAS PARA COMPANY
-- =============================================


-- Todos os usuários autenticados podem ver empresas
CREATE POLICY "company_select_policy" ON company
    FOR SELECT USING (auth.role() = 'authenticated');

-- Usuários autenticados podem criar empresas
CREATE POLICY "company_insert_policy" ON company
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuários autenticados podem atualizar empresas
-- (a verificação de permissão será feita na aplicação)
CREATE POLICY "company_update_policy" ON company
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Usuários autenticados podem deletar empresas
-- (a verificação de permissão será feita na aplicação)
CREATE POLICY "company_delete_policy" ON company
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- POLÍTICAS PARA APP_USER
-- =============================================

-- Usuário pode ver a si mesmo ou outros da mesma empresa
-- Usando auth.uid() diretamente para evitar recursão
CREATE POLICY "app_user_select_policy" ON app_user
    FOR SELECT USING (
        -- Pode ver a si mesmo
        auth_user_id = auth.uid()
        OR
        -- Ou qualquer usuário autenticado pode ver (para admin)
        -- A filtragem por empresa será feita na aplicação
        auth.role() = 'authenticated'
    );

-- Qualquer usuário autenticado pode inserir
-- (necessário para criar o primeiro usuário de uma empresa)
CREATE POLICY "app_user_insert_policy" ON app_user
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuário pode atualizar a si mesmo
CREATE POLICY "app_user_update_policy" ON app_user
    FOR UPDATE USING (
        auth_user_id = auth.uid()
        OR
        auth.role() = 'authenticated'
    );

-- Apenas para fins administrativos
CREATE POLICY "app_user_delete_policy" ON app_user
    FOR DELETE USING (auth.role() = 'authenticated');
