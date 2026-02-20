-- Fix Supabase linter WARN 0011: function_search_path_mutable
-- Scope: harden function execution context by pinning search_path.

ALTER FUNCTION public.set_default_social_name()
SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_pad_shifts(uuid, date, date)
SET search_path = public, pg_temp;

ALTER FUNCTION public.pad_company_integrity_guard()
SET search_path = public, pg_temp;
