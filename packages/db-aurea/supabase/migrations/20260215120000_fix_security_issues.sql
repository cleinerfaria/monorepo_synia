-- =====================================================
-- MIGRATION: Fix Security Issues - Phase 1
-- 
-- Corrige alertas do Supabase Linter:
-- Enable RLS em prescription_item_occurrence
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Enable RLS on prescription_item_occurrence
--    This table contains patient-related data (patient_id is sensitive)
--    RLS policies will be added in a separate migration
-- =====================================================

ALTER TABLE public.prescription_item_occurrence ENABLE ROW LEVEL SECURITY;

-- Note: The views (vw_ref_item_current_price, vw_ref_source_stats, vw_ref_item_unified)
-- are reference data views and are read-only. They will be addressed separately
-- in a future migration with proper RLS policies on the underlying tables.

COMMIT;
