-- =====================================================
-- FIX APP_USER UNIQUE CONSTRAINT
-- Remove UNIQUE constraint from auth_user_id alone
-- Add UNIQUE composite index on (auth_user_id, company_id)
-- Update FK in user_action_logs to reference composite key
-- =====================================================

-- 1) Drop the dependent foreign key first
ALTER TABLE public.user_action_logs
DROP CONSTRAINT IF EXISTS user_action_logs_user_id_app_user_fkey;

-- 2) Drop the existing UNIQUE constraint on auth_user_id alone
ALTER TABLE public.app_user
DROP CONSTRAINT app_user_auth_user_id_key;

-- 3) Add UNIQUE composite index on (auth_user_id, company_id)
CREATE UNIQUE INDEX idx_app_user_auth_company_unique
ON public.app_user(auth_user_id, company_id);

-- 4) Recreate the foreign key with composite reference
ALTER TABLE public.user_action_logs
ADD CONSTRAINT user_action_logs_user_id_app_user_fkey
FOREIGN KEY (user_id, company_id)
REFERENCES public.app_user(auth_user_id, company_id)
ON DELETE SET NULL;
