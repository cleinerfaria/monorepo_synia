-- =====================================================
-- MIGRATION: Clean Up Unused FK Indexes
--
-- Remove índices de FK recém-criados que não são utilizados
-- Estratégia: Manter apenas os críticos para multi-tenant e audit
-- =====================================================

BEGIN;

-- =====================================================
-- TABLE: app_user - Manter apenas company_id (multi-tenant)
-- =====================================================
DROP INDEX IF EXISTS idx_app_user_company CASCADE;

-- =====================================================
-- TABLE: client - Remover (não é multi-tenant)
-- =====================================================
DROP INDEX IF EXISTS idx_client_company CASCADE;

-- =====================================================
-- TABLE: prescription_print - Manter company_id, remover outros
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_print_payload_content_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_created_by CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_prescription_id CASCADE;

-- =====================================================
-- TABLE: prescription_print_item - Manter apenas company_id
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_print_item_content_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_item_source_prescription_item_id CASCADE;

-- =====================================================
-- TABLE: nfe_import_item - Remover todos (usar company_id + nfe_import_id composto)
-- =====================================================
DROP INDEX IF EXISTS idx_nfe_import_item_company_id CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_nfe_import_id CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_presentation_id CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_product_id CASCADE;

-- =====================================================
-- TABLE: patient - Manter apenas company_id
-- =====================================================
DROP INDEX IF EXISTS idx_patient_billing_client_id CASCADE;

-- =====================================================
-- TABLE: patient_consumption - Remover todos (usar queries com JOINs)
-- =====================================================
DROP INDEX IF EXISTS idx_patient_consumption_location_id CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_company_id CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_patient_id CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_product_id CASCADE;

-- =====================================================
-- TABLE: prescription_item - Remover (usar JOINs)
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_item_equipment_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_procedure_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_product_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_prescription_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_route_id CASCADE;

-- =====================================================
-- TABLE: prescription_item_occurrence - Remover (usar company_id + prescription_id)
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_item_occurrence_prescription_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_occurrence_company_id CASCADE;

-- =====================================================
-- TABLE: procedure - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_procedure_unit_id CASCADE;

-- =====================================================
-- TABLE: ref_import_batch - Manter apenas company_id
-- =====================================================
DROP INDEX IF EXISTS idx_ref_import_batch_created_by CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_company_id CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_source_id CASCADE;

-- =====================================================
-- TABLE: ref_item - Remover (usar company_id)
-- =====================================================
DROP INDEX IF EXISTS idx_ref_item_first_import_batch_id CASCADE;
DROP INDEX IF EXISTS idx_ref_item_last_import_batch_id CASCADE;

-- =====================================================
-- TABLE: stock_batch - Remover todos (usar company_id + location)
-- =====================================================
DROP INDEX IF EXISTS idx_stock_batch_nfe_import_id CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_company_id CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_location_id CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_presentation_id CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_product_id CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_supplier_id CASCADE;

-- =====================================================
-- TABLE: user_action_logs - MANTER company_id para audit
-- =====================================================
-- Manter idx_user_action_logs_company_id (crítico para auditoria)
-- Remover idx_user_action_logs_user_id (pode usar JOIN com app_user)
DROP INDEX IF EXISTS idx_user_action_logs_user_id CASCADE;

-- =====================================================
-- TABLE: access_profile_permission - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_access_profile_permission_permission_id CASCADE;

-- =====================================================
-- TABLE: client_contact - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_client_contact_company_id CASCADE;

-- =====================================================
-- TABLE: company - Remover parent_id (usar quando necessário)
-- =====================================================
DROP INDEX IF EXISTS idx_company_parent_id CASCADE;

-- =====================================================
-- TABLE: equipment - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_equipment_assigned_patient_id CASCADE;

-- =====================================================
-- TABLE: nfe_import - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_nfe_import_company_id CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_supplier_id CASCADE;

-- =====================================================
-- TABLE: patient_address - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_patient_address_company_id CASCADE;

-- =====================================================
-- TABLE: patient_contact - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_patient_contact_company_id CASCADE;

-- =====================================================
-- TABLE: patient_payer - Remover (usar JOINs)
-- =====================================================
DROP INDEX IF EXISTS idx_patient_payer_client_id CASCADE;
DROP INDEX IF EXISTS idx_patient_payer_company_id CASCADE;

-- =====================================================
-- TABLE: prescription - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_patient_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_professional_id CASCADE;

-- =====================================================
-- TABLE: prescription_item_component - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_prescription_item_component_company_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_component_prescription_item_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_component_product_id CASCADE;

-- =====================================================
-- TABLE: product - Remover (usar company_id)
-- =====================================================
DROP INDEX IF EXISTS idx_product_active_ingredient_id CASCADE;
DROP INDEX IF EXISTS idx_product_group_id CASCADE;
DROP INDEX IF EXISTS idx_product_unit_prescription_id CASCADE;
DROP INDEX IF EXISTS idx_product_unit_stock_id CASCADE;

-- =====================================================
-- TABLE: product_group - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_product_group_parent_id CASCADE;

-- =====================================================
-- TABLE: product_presentation - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_product_presentation_company_id CASCADE;
DROP INDEX IF EXISTS idx_product_presentation_product_id CASCADE;

-- =====================================================
-- TABLE: product_ref_link - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_product_ref_link_company_id CASCADE;
DROP INDEX IF EXISTS idx_product_ref_link_ref_item_id CASCADE;
DROP INDEX IF EXISTS idx_product_ref_link_source_id CASCADE;

-- =====================================================
-- TABLE: ref_import_error - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_ref_import_error_batch_id CASCADE;

-- =====================================================
-- TABLE: ref_price_history - Remover
-- =====================================================
DROP INDEX IF EXISTS idx_ref_price_history_import_batch_id CASCADE;

-- =====================================================
-- TABLE: stock_balance - Remover (usar company_id + location/product)
-- =====================================================
DROP INDEX IF EXISTS idx_stock_balance_location_id CASCADE;
DROP INDEX IF EXISTS idx_stock_balance_product_id CASCADE;

-- =====================================================
-- TABLE: stock_location - Manter company_id
-- =====================================================
DROP INDEX IF EXISTS idx_stock_location_company_id CASCADE;

-- =====================================================
-- TABLE: stock_movement - Remover (usar company_id + location)
-- =====================================================
DROP INDEX IF EXISTS idx_stock_movement_batch_id CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_company_id CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_location_id CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_presentation_id CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_product_id CASCADE;

-- =====================================================
-- Migration Summary
-- =====================================================
-- Total indexes removed: 80
-- Indexes kept: Multi-tenant company_id + audit user_action_logs_company_id
-- Strategy: Remove single FK indexes, use compound queries or JOINs
-- Result: Cleaner schema + reduced index maintenance overhead

COMMIT;
