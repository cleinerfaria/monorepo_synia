-- =====================================================
-- MIGRATION: Fix Supabase Database Linter Warnings
--
-- Corrige alertas WARN do Supabase Linter:
-- 1. function_search_path_mutable: SET search_path em 17 funções/procedures
-- 2. extension_in_public: Move unaccent para schema extensions
-- 3. materialized_view_in_api: Revoga SELECT do anon nas MVs
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

COMMIT;
