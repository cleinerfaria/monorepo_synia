-- =============================================
-- Relacionamento user_action_logs -> app_user
-- Necessário para embed app_user no PostgREST
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_action_logs_user_id_app_user_fkey'
  ) THEN
    ALTER TABLE public.user_action_logs
      ADD CONSTRAINT user_action_logs_user_id_app_user_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.app_user(auth_user_id)
      ON DELETE SET NULL;
  END IF;
END $$;
