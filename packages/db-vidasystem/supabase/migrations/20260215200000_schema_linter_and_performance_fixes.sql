-- =====================================================
-- MIGRATION: Schema, Linter and Performance Fixes - Consolidated
--
-- Consolida 2 migrations de 15/02:
-- 1. Fix Supabase Database Linter Warnings
-- 2. Fix RLS Performance Issues
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1: function_search_path_mutable
-- Adicionar SET search_path = public via ALTER FUNCTION/PROCEDURE.
-- =====================================================

-- 1.1 Trigger functions (sem parâmetros, retornam TRIGGER)
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;

ALTER FUNCTION public.update_ref_updated_at()
  SET search_path = public;

ALTER FUNCTION public.set_updated_at()
  SET search_path = public;

ALTER FUNCTION public.trg_app_user_profile_company_guard()
  SET search_path = public;

ALTER FUNCTION public.trg_prescription_item_component_company_guard()
  SET search_path = public;

ALTER FUNCTION public.update_stock_balance()
  SET search_path = public;

ALTER FUNCTION public.trigger_refresh_known_products_ref()
  SET search_path = public;

ALTER FUNCTION public.trigger_notify_refresh_known_products_ref_prices()
  SET search_path = public;

-- 1.2 Funções helper de segurança
ALTER FUNCTION public.get_user_company_id()
  SET search_path = public;

ALTER FUNCTION public.is_user_admin()
  SET search_path = public;

-- 1.3 Funções com parâmetros
ALTER FUNCTION public.get_paired_manufacturers(uuid)
  SET search_path = public;

ALTER FUNCTION public.refresh_known_products_ref_view()
  SET search_path = public;

ALTER FUNCTION public.refresh_known_products_ref_prices_view()
  SET search_path = public;

ALTER FUNCTION public.hash_print_payload_v1(jsonb, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.hash_print_item_v1(text, text, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.generate_prescription_occurrences(uuid, date, date)
  SET search_path = public;

-- 1.4 Procedure (sintaxe diferente de FUNCTION)
ALTER PROCEDURE public.recalculate_stock_balances()
  SET search_path = public;

-- =====================================================
-- PARTE 2: extension_in_public
-- Mover extensão unaccent do schema public para extensions.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Wrapper para retrocompatibilidade com referências a public.unaccent()
CREATE OR REPLACE FUNCTION public.unaccent(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = extensions
AS $$
  SELECT extensions.unaccent(input);
$$;

-- =====================================================
-- PARTE 3: materialized_view_in_api
-- Revogar SELECT do role anon nas materialized views.
-- O role authenticated mantém acesso (usado pelo front-end).
-- =====================================================

REVOKE SELECT ON public.mv_known_products_ref FROM anon;
REVOKE SELECT ON public.mv_known_products_ref_prices FROM anon;

-- =====================================================
-- PARTE 4: FIX RLS PERFORMANCE ISSUES
-- Resolve auth_rls_initplan and multiple_permissive_policies warnings
-- Per Supabase docs: wrap auth.uid() and auth.role() in subqueries
-- =====================================================

-- 1) COMPANY TABLE - Fix auth.role() evaluation and remove duplicates
DROP POLICY IF EXISTS "Users can view their own company" ON public.company;
DROP POLICY IF EXISTS "Admins can update their company" ON public.company;

DROP POLICY IF EXISTS "company_select_policy" ON public.company;
CREATE POLICY "company_select_policy" ON public.company
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_insert_policy" ON public.company;
CREATE POLICY "company_insert_policy" ON public.company
    FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_update_policy" ON public.company;
CREATE POLICY "company_update_policy" ON public.company
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_delete_policy" ON public.company;
CREATE POLICY "company_delete_policy" ON public.company
    FOR DELETE USING ((SELECT auth.role()) = 'authenticated');

-- 2) company_unit TABLE - Fix auth.role() evaluation
DROP POLICY IF EXISTS "company_unit_select_policy" ON public.company_unit;
CREATE POLICY "company_unit_select_policy" ON public.company_unit
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_unit_insert_policy" ON public.company_unit;
CREATE POLICY "company_unit_insert_policy" ON public.company_unit
    FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_unit_update_policy" ON public.company_unit;
CREATE POLICY "company_unit_update_policy" ON public.company_unit
    FOR UPDATE USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "company_unit_delete_policy" ON public.company_unit;
CREATE POLICY "company_unit_delete_policy" ON public.company_unit
    FOR DELETE USING ((SELECT auth.role()) = 'authenticated');

-- 3) APP_USER TABLE - Fix auth.uid() and auth.role() evaluation
DROP POLICY IF EXISTS "Users can view users in their company" ON public.app_user;
DROP POLICY IF EXISTS "Users can create own record or admins can insert" ON public.app_user;
DROP POLICY IF EXISTS "Users can update own record or admins can update" ON public.app_user;

DROP POLICY IF EXISTS "app_user_select_policy" ON public.app_user;
CREATE POLICY "app_user_select_policy" ON public.app_user
    FOR SELECT USING (
        auth_user_id = (SELECT auth.uid())
        OR
        (SELECT auth.role()) = 'authenticated'
    );

DROP POLICY IF EXISTS "app_user_insert_policy" ON public.app_user;
CREATE POLICY "app_user_insert_policy" ON public.app_user
    FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "app_user_update_policy" ON public.app_user;
CREATE POLICY "app_user_update_policy" ON public.app_user
    FOR UPDATE USING (
        auth_user_id = (SELECT auth.uid())
        OR
        (SELECT auth.role()) = 'authenticated'
    );

DROP POLICY IF EXISTS "Admins can delete users" ON public.app_user;
DROP POLICY IF EXISTS "app_user_delete_policy" ON public.app_user;
CREATE POLICY "app_user_delete_policy" ON public.app_user
    FOR DELETE USING ((SELECT auth.role()) = 'authenticated');

-- 4) ADMINISTRATION_ROUTES TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "Users can view administration routes from their company" ON public.administration_routes;
CREATE POLICY "Users can view administration routes from their company"
  ON public.administration_routes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM app_user
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin/managers can manage administration routes" ON public.administration_routes;
CREATE POLICY "Admin/managers can insert administration routes"
  ON public.administration_routes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT au.company_id
      FROM app_user au
      JOIN access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = (SELECT auth.uid())
      AND ap.is_admin = TRUE
    )
  );

CREATE POLICY "Admin/managers can update administration routes"
  ON public.administration_routes FOR UPDATE
  USING (
    company_id IN (
      SELECT au.company_id
      FROM app_user au
      JOIN access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = (SELECT auth.uid())
      AND ap.is_admin = TRUE
    )
  );

CREATE POLICY "Admin/managers can delete administration routes"
  ON public.administration_routes FOR DELETE
  USING (
    company_id IN (
      SELECT au.company_id
      FROM app_user au
      JOIN access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = (SELECT auth.uid())
      AND ap.is_admin = TRUE
    )
  );

-- 5) REF_IMPORT_BATCH TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "ref_import_batch_company" ON public.ref_import_batch;
CREATE POLICY "ref_import_batch_company" ON public.ref_import_batch
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- 6) REF_IMPORT_ERROR TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "ref_import_error_company" ON public.ref_import_error;
CREATE POLICY "ref_import_error_company" ON public.ref_import_error
    FOR ALL USING (
        batch_id IN (
            SELECT id FROM ref_import_batch WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
            )
        )
    );

-- 7) REF_ITEM TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "ref_item_company" ON public.ref_item;
CREATE POLICY "ref_item_company" ON public.ref_item
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- 8) REF_PRICE_HISTORY TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "ref_price_history_company" ON public.ref_price_history;
CREATE POLICY "ref_price_history_company" ON public.ref_price_history
    FOR ALL USING (
        item_id IN (
            SELECT id FROM ref_item WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
            )
        )
        OR
        import_batch_id IN (
            SELECT id FROM ref_import_batch WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
            )
        )
    );

-- 9) PRODUCT_REF_LINK TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "product_ref_link_company_isolation" ON public.product_ref_link;
CREATE POLICY "product_ref_link_company_isolation" ON public.product_ref_link
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- 10) PRODUCT_GROUP TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "Users can view global and company groups" ON public.product_group;
CREATE POLICY "Users can view global and company groups"
    ON public.product_group FOR SELECT
    USING (
        company_id IS NULL
        OR company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert groups in their company" ON public.product_group;
CREATE POLICY "Users can insert groups in their company"
    ON public.product_group FOR INSERT
    WITH CHECK (
        company_id IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update company groups" ON public.product_group;
CREATE POLICY "Users can update company groups"
    ON public.product_group FOR UPDATE
    USING (
        company_id IS NOT NULL
        AND is_system = FALSE
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete company groups" ON public.product_group;
CREATE POLICY "Users can delete company groups"
    ON public.product_group FOR DELETE
    USING (
        company_id IS NOT NULL
        AND is_system = FALSE
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- 11) USER_ACTION_LOGS TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS "Users can view logs from their company" ON public.user_action_logs;
CREATE POLICY "Users can view logs from their company"
  ON public.user_action_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT au.company_id FROM app_user au WHERE au.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only admins can delete logs" ON public.user_action_logs;
CREATE POLICY "Only admins can delete logs"
  ON public.user_action_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_user au
      JOIN access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.company_id = user_action_logs.company_id
      AND ap.is_admin = TRUE
    )
  );

-- 12) ACCESS_PROFILE TABLE - Fix auth.uid() and auth.role() evaluation
DROP POLICY IF EXISTS "access_profile_select_policy" ON public.access_profile;
CREATE POLICY "access_profile_select_policy" ON public.access_profile
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DROP POLICY IF EXISTS "access_profile_insert_policy" ON public.access_profile;
CREATE POLICY "access_profile_insert_policy" ON public.access_profile
    FOR INSERT WITH CHECK (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DROP POLICY IF EXISTS "access_profile_update_policy" ON public.access_profile;
CREATE POLICY "access_profile_update_policy" ON public.access_profile
    FOR UPDATE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DROP POLICY IF EXISTS "access_profile_delete_policy" ON public.access_profile;
CREATE POLICY "access_profile_delete_policy" ON public.access_profile
    FOR DELETE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

-- 13) ACCESS_PROFILE_PERMISSION TABLE - Fix auth.uid() and auth.role() evaluation
DROP POLICY IF EXISTS "access_profile_permission_select_policy" ON public.access_profile_permission;
CREATE POLICY "access_profile_permission_select_policy" ON public.access_profile_permission
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

DROP POLICY IF EXISTS "access_profile_permission_insert_policy" ON public.access_profile_permission;
CREATE POLICY "access_profile_permission_insert_policy" ON public.access_profile_permission
    FOR INSERT WITH CHECK (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

DROP POLICY IF EXISTS "access_profile_permission_delete_policy" ON public.access_profile_permission;
CREATE POLICY "access_profile_permission_delete_policy" ON public.access_profile_permission
    FOR DELETE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

-- 14) UNIT_OF_MEASURE TABLE - Fix auth.uid() evaluation
DROP POLICY IF EXISTS unit_of_measure_select_policy ON public.unit_of_measure;
CREATE POLICY unit_of_measure_select_policy
    ON public.unit_of_measure
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS unit_of_measure_insert_policy ON public.unit_of_measure;
CREATE POLICY unit_of_measure_insert_policy
    ON public.unit_of_measure
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS unit_of_measure_update_policy ON public.unit_of_measure;
CREATE POLICY unit_of_measure_update_policy
    ON public.unit_of_measure
    FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS unit_of_measure_delete_policy ON public.unit_of_measure;
CREATE POLICY unit_of_measure_delete_policy
    ON public.unit_of_measure
    FOR DELETE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.app_user WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- 15) REF_PRICE_HISTORY TABLE - Remove duplicate index
DROP INDEX IF EXISTS public.idx_ref_price_history_batch;

COMMIT;
