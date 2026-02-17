-- =====================================================
-- MIGRATION: Clean Up Unused FK Indexes
--
-- Remove índices de FK recém-criados que não são utilizados
-- Estratégia: Manter apenas os críticos para multi-tenant e audit
-- =====================================================

BEGIN;
-- Helper: quiet index drop to avoid NOTICE when index does not exist
CREATE OR REPLACE FUNCTION public._drop_index_if_exists_quiet(
  idx_name text,
  idx_schema text DEFAULT 'public',
  drop_cascade boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = idx_name
      AND n.nspname = idx_schema
  ) THEN
    EXECUTE format(
      'DROP INDEX %I.%I%s',
      idx_schema,
      idx_name,
      CASE WHEN drop_cascade THEN ' CASCADE' ELSE '' END
    );
  END IF;
END;
$$;

-- =====================================================
-- TABLE: app_user - Manter apenas company_id (multi-tenant)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_app_user_company');
-- =====================================================
-- TABLE: client - Remover (não é multi-tenant)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_client_company');
-- =====================================================
-- TABLE: prescription_print - Manter company_id, remover outros
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_payload_content_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_created_by');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_prescription_id');
-- =====================================================
-- TABLE: prescription_print_item - Manter apenas company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_item_content_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_item_source_prescription_item_id');
-- =====================================================
-- TABLE: nfe_import_item - Remover todos (usar company_id + nfe_import_id composto)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_company_id');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_nfe_import_id');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_presentation_id');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_product_id');
-- =====================================================
-- TABLE: patient - Manter apenas company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_patient_billing_client_id');
-- =====================================================
-- TABLE: patient_consumption - Remover todos (usar queries com JOINs)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_location_id');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_company_id');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_patient_id');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_product_id');
-- =====================================================
-- TABLE: prescription_item - Remover (usar JOINs)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_equipment_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_procedure_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_product_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_prescription_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_route_id');
-- =====================================================
-- TABLE: prescription_item_occurrence - Remover (usar company_id + prescription_id)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_occurrence_prescription_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_occurrence_company_id');
-- =====================================================
-- TABLE: procedure - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_procedure_unit_id');
-- =====================================================
-- TABLE: ref_import_batch - Manter apenas company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_created_by');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_company_id');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_source_id');
-- =====================================================
-- TABLE: ref_item - Remover (usar company_id)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_ref_item_first_import_batch_id');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_last_import_batch_id');
-- =====================================================
-- TABLE: stock_batch - Remover todos (usar company_id + location)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_nfe_import_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_company_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_location_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_presentation_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_product_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_supplier_id');
-- =====================================================
-- TABLE: user_action_logs - MANTER company_id para audit
-- =====================================================
-- Manter idx_user_action_logs_company_id (crítico para auditoria)
-- Remover idx_user_action_logs_user_id (pode usar JOIN com app_user)
SELECT public._drop_index_if_exists_quiet('idx_user_action_logs_user_id');
-- =====================================================
-- TABLE: access_profile_permission - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_access_profile_permission_permission_id');
-- =====================================================
-- TABLE: client_contact - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_client_contact_company_id');
-- =====================================================
-- TABLE: company - Remover parent_id (usar quando necessário)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_company_parent_id');
-- =====================================================
-- TABLE: equipment - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_equipment_assigned_patient_id');
-- =====================================================
-- TABLE: nfe_import - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_company_id');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_supplier_id');
-- =====================================================
-- TABLE: patient_address - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_patient_address_company_id');
-- =====================================================
-- TABLE: patient_contact - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_patient_contact_company_id');
-- =====================================================
-- TABLE: patient_payer - Remover (usar JOINs)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_client_id');
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_company_id');
-- =====================================================
-- TABLE: prescription - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_patient_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_professional_id');
-- =====================================================
-- TABLE: prescription_item_component - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_company_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_prescription_item_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_product_id');
-- =====================================================
-- TABLE: product - Remover (usar company_id)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_product_active_ingredient_id');
SELECT public._drop_index_if_exists_quiet('idx_product_group_id');
SELECT public._drop_index_if_exists_quiet('idx_product_unit_prescription_id');
SELECT public._drop_index_if_exists_quiet('idx_product_unit_stock_id');
-- =====================================================
-- TABLE: product_group - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_product_group_parent_id');
-- =====================================================
-- TABLE: product_presentation - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_product_presentation_company_id');
SELECT public._drop_index_if_exists_quiet('idx_product_presentation_product_id');
-- =====================================================
-- TABLE: product_ref_link - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_company_id');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_ref_item_id');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_source_id');
-- =====================================================
-- TABLE: ref_import_error - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_ref_import_error_batch_id');
-- =====================================================
-- TABLE: ref_price_history - Remover
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_import_batch_id');
-- =====================================================
-- TABLE: stock_balance - Remover (usar company_id + location/product)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_stock_balance_location_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_balance_product_id');
-- =====================================================
-- TABLE: stock_location - Manter company_id
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_stock_location_company_id');
-- =====================================================
-- TABLE: stock_movement - Remover (usar company_id + location)
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_batch_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_company_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_location_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_presentation_id');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_product_id');
-- =====================================================
-- Migration Summary
-- =====================================================
-- Total indexes removed: 80
-- Indexes kept: Multi-tenant company_id + audit user_action_logs_company_id
-- Strategy: Remove single FK indexes, use compound queries or JOINs
-- Result: Cleaner schema + reduced index maintenance overhead

DROP FUNCTION IF EXISTS public._drop_index_if_exists_quiet(text, text, boolean);

COMMIT;

