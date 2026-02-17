-- =====================================================
-- MIGRATION: Indexes Optimization - Consolidated
--
-- Consolida 4 migrations de 15/02:
-- 1. Add missing foreign key indexes (batch 1: 16 indexes)
-- 2. Remove unused indexes (127 indexes)
-- 3. Add remaining foreign key indexes (batch 2: 43 indexes)
-- 4. Fix duplicate index (1 index)
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
-- PARTE 1: ADD MISSING FOREIGN KEY INDEXES (BATCH 1)
-- Performance optimization: Create indexes for unindexed foreign keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_nfe_import_item_product_id 
  ON public.nfe_import_item(product_id);

CREATE INDEX IF NOT EXISTS idx_patient_consumption_location_id 
  ON public.patient_consumption(location_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_equipment_id 
  ON public.prescription_item(equipment_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_procedure_id 
  ON public.prescription_item(procedure_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_product_id 
  ON public.prescription_item(product_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_occurrence_prescription_id 
  ON public.prescription_item_occurrence(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_print_created_by 
  ON public.prescription_print(created_by);

CREATE INDEX IF NOT EXISTS idx_prescription_print_prescription_id 
  ON public.prescription_print(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_print_item_source_prescription_item_id 
  ON public.prescription_print_item(source_prescription_item_id);

CREATE INDEX IF NOT EXISTS idx_procedure_unit_id 
  ON public.procedure(unit_id);

CREATE INDEX IF NOT EXISTS idx_ref_import_batch_created_by 
  ON public.ref_import_batch(created_by);

CREATE INDEX IF NOT EXISTS idx_ref_item_first_import_batch_id 
  ON public.ref_item(first_import_batch_id);

CREATE INDEX IF NOT EXISTS idx_ref_item_last_import_batch_id 
  ON public.ref_item(last_import_batch_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_nfe_import_id 
  ON public.stock_batch(nfe_import_id);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_id_app_user 
  ON public.user_action_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_id 
  ON public.user_action_logs(user_id);

-- =====================================================
-- PARTE 2: REMOVE UNUSED INDEXES (PERFORMANCE CLEANUP)
-- These indexes have NEVER been used and are safe to remove
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_presentation_unit');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_source');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_company');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_status');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_file_hash');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_created');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_batch_cancelled');
SELECT public._drop_index_if_exists_quiet('idx_ref_import_error_batch');
SELECT public._drop_index_if_exists_quiet('idx_app_user_auth');
SELECT public._drop_index_if_exists_quiet('idx_client_ans_code');
SELECT public._drop_index_if_exists_quiet('idx_client_tiss');
SELECT public._drop_index_if_exists_quiet('idx_professional_company');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_company');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_external_code');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_ean');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_product_name');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_tiss');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_tuss');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_manufacturer_code');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_category');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_active');
SELECT public._drop_index_if_exists_quiet('idx_product_company');
SELECT public._drop_index_if_exists_quiet('idx_product_type');
SELECT public._drop_index_if_exists_quiet('idx_product_active_ingredient');
SELECT public._drop_index_if_exists_quiet('idx_product_unit_stock');
SELECT public._drop_index_if_exists_quiet('idx_product_unit_prescription');
SELECT public._drop_index_if_exists_quiet('idx_product_group');
SELECT public._drop_index_if_exists_quiet('idx_equipment_company');
SELECT public._drop_index_if_exists_quiet('idx_equipment_status');
SELECT public._drop_index_if_exists_quiet('idx_equipment_patient');
SELECT public._drop_index_if_exists_quiet('idx_stock_location_company');
SELECT public._drop_index_if_exists_quiet('idx_stock_balance_company');
SELECT public._drop_index_if_exists_quiet('idx_stock_balance_location');
SELECT public._drop_index_if_exists_quiet('idx_stock_balance_product');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_item');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_type');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_valid');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_item_type_date');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_import_batch');
SELECT public._drop_index_if_exists_quiet('idx_ref_price_history_item_type_valid_created');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_company');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_location');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_product');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_date');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_batch');
SELECT public._drop_index_if_exists_quiet('idx_stock_movement_presentation');
SELECT public._drop_index_if_exists_quiet('idx_prescription_company');
SELECT public._drop_index_if_exists_quiet('idx_prescription_patient');
SELECT public._drop_index_if_exists_quiet('idx_prescription_professional');
SELECT public._drop_index_if_exists_quiet('idx_prescription_status');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_patient');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_product');
SELECT public._drop_index_if_exists_quiet('idx_patient_consumption_date');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_company');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_product');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_ref_item');
SELECT public._drop_index_if_exists_quiet('idx_product_ref_link_source');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_company');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_status');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_key');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_supplier');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_company');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_nfe');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_product_code');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_ean');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_presentation');
SELECT public._drop_index_if_exists_quiet('idx_nfe_import_item_nfe_item_number');
SELECT public._drop_index_if_exists_quiet('idx_administration_routes_company');
SELECT public._drop_index_if_exists_quiet('idx_administration_routes_active');
SELECT public._drop_index_if_exists_quiet('idx_administration_routes_prescription_order');
SELECT public._drop_index_if_exists_quiet('idx_presentation_company');
SELECT public._drop_index_if_exists_quiet('idx_presentation_product');
SELECT public._drop_index_if_exists_quiet('idx_presentation_barcode');
SELECT public._drop_index_if_exists_quiet('idx_product_presentation_company_barcode');
SELECT public._drop_index_if_exists_quiet('idx_active_ingredient_company');
SELECT public._drop_index_if_exists_quiet('idx_active_ingredient_name');
SELECT public._drop_index_if_exists_quiet('idx_batch_company');
SELECT public._drop_index_if_exists_quiet('idx_batch_product');
SELECT public._drop_index_if_exists_quiet('idx_batch_location');
SELECT public._drop_index_if_exists_quiet('idx_batch_number');
SELECT public._drop_index_if_exists_quiet('idx_batch_expiration');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_supplier');
SELECT public._drop_index_if_exists_quiet('idx_stock_batch_presentation');
SELECT public._drop_index_if_exists_quiet('idx_manufacturer_company');
SELECT public._drop_index_if_exists_quiet('idx_manufacturer_name');
SELECT public._drop_index_if_exists_quiet('idx_supplier_company');
SELECT public._drop_index_if_exists_quiet('idx_supplier_name');
SELECT public._drop_index_if_exists_quiet('idx_supplier_document');
SELECT public._drop_index_if_exists_quiet('idx_unit_of_measure_company');
SELECT public._drop_index_if_exists_quiet('idx_unit_of_measure_company_code');
SELECT public._drop_index_if_exists_quiet('idx_unit_of_measure_company_active');
SELECT public._drop_index_if_exists_quiet('idx_unit_of_measure_allowed_scopes_gin');
SELECT public._drop_index_if_exists_quiet('idx_product_group_company');
SELECT public._drop_index_if_exists_quiet('idx_product_group_parent');
SELECT public._drop_index_if_exists_quiet('idx_product_group_active');
SELECT public._drop_index_if_exists_quiet('idx_patient_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_billing_client');
SELECT public._drop_index_if_exists_quiet('idx_patient_name');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_patient');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_patient_active');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_patient_city');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_use_for_service');
SELECT public._drop_index_if_exists_quiet('idx_patient_address_geolocation');
SELECT public._drop_index_if_exists_quiet('idx_patient_contact_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_contact_patient');
SELECT public._drop_index_if_exists_quiet('idx_patient_contact_patient_type');
SELECT public._drop_index_if_exists_quiet('idx_patient_identifier_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_identifier_patient');
SELECT public._drop_index_if_exists_quiet('idx_patient_identifier_patient_source');
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_company');
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_patient');
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_client');
SELECT public._drop_index_if_exists_quiet('idx_patient_payer_patient_active');
SELECT public._drop_index_if_exists_quiet('idx_client_contact_company');
SELECT public._drop_index_if_exists_quiet('idx_client_contact_client');
SELECT public._drop_index_if_exists_quiet('idx_client_contact_client_type');
SELECT public._drop_index_if_exists_quiet('idx_user_action_logs_company_date');
SELECT public._drop_index_if_exists_quiet('idx_user_action_logs_company_entity_date');
SELECT public._drop_index_if_exists_quiet('idx_user_action_logs_company_user_date');
SELECT public._drop_index_if_exists_quiet('idx_mv_known_products_ref_prices_price_date');
SELECT public._drop_index_if_exists_quiet('idx_mv_known_products_ref_company_ean');
SELECT public._drop_index_if_exists_quiet('idx_mv_known_products_ref_last_refresh');
SELECT public._drop_index_if_exists_quiet('idx_procedure_company');
SELECT public._drop_index_if_exists_quiet('idx_procedure_company_category');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_company');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_prescription');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_order');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_company_is_active');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_company_type');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_company_week_days_gin');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_route_id');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_company_supplier');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_company');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_item');
SELECT public._drop_index_if_exists_quiet('idx_prescription_item_component_product');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_company_created');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_company_prescription_created');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_company_prescription_period');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_item_company_print');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_payload_content_company_content_hash');
SELECT public._drop_index_if_exists_quiet('idx_prescription_print_item_content_company_content_hash');
SELECT public._drop_index_if_exists_quiet('idx_occurrence_company_patient_time');
SELECT public._drop_index_if_exists_quiet('idx_occurrence_prescription_item');
SELECT public._drop_index_if_exists_quiet('idx_occurrence_pending');
SELECT public._drop_index_if_exists_quiet('idx_company_parent_id');
SELECT public._drop_index_if_exists_quiet('idx_access_profile_permission_profile');
SELECT public._drop_index_if_exists_quiet('idx_access_profile_permission_permission');
SELECT public._drop_index_if_exists_quiet('idx_ref_item_company_ean');
-- =====================================================
-- PARTE 3: ADD REMAINING FOREIGN KEY INDEXES (BATCH 2)
-- Additional 43 unindexed FKs
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_access_profile_permission_permission_id 
  ON public.access_profile_permission(permission_id);

CREATE INDEX IF NOT EXISTS idx_client_contact_company_id 
  ON public.client_contact(company_id);

CREATE INDEX IF NOT EXISTS idx_company_parent_id 
  ON public.company(company_parent_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assigned_patient_id 
  ON public.equipment(assigned_patient_id);

CREATE INDEX IF NOT EXISTS idx_nfe_import_company_id 
  ON public.nfe_import(company_id);

CREATE INDEX IF NOT EXISTS idx_nfe_import_supplier_id 
  ON public.nfe_import(supplier_id);

CREATE INDEX IF NOT EXISTS idx_nfe_import_item_company_id 
  ON public.nfe_import_item(company_id);

CREATE INDEX IF NOT EXISTS idx_nfe_import_item_nfe_import_id 
  ON public.nfe_import_item(nfe_import_id);

CREATE INDEX IF NOT EXISTS idx_nfe_import_item_presentation_id 
  ON public.nfe_import_item(presentation_id);

CREATE INDEX IF NOT EXISTS idx_patient_billing_client_id 
  ON public.patient(billing_client_id);

CREATE INDEX IF NOT EXISTS idx_patient_address_company_id 
  ON public.patient_address(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_consumption_company_id 
  ON public.patient_consumption(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_consumption_patient_id 
  ON public.patient_consumption(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_consumption_product_id 
  ON public.patient_consumption(product_id);

CREATE INDEX IF NOT EXISTS idx_patient_contact_company_id 
  ON public.patient_contact(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_payer_client_id 
  ON public.patient_payer(client_id);

CREATE INDEX IF NOT EXISTS idx_patient_payer_company_id 
  ON public.patient_payer(company_id);

CREATE INDEX IF NOT EXISTS idx_prescription_patient_id 
  ON public.prescription(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescription_professional_id 
  ON public.prescription(professional_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_prescription_id 
  ON public.prescription_item(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_route_id 
  ON public.prescription_item(route_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_component_company_id 
  ON public.prescription_item_component(company_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_component_prescription_item_id 
  ON public.prescription_item_component(prescription_item_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_component_product_id 
  ON public.prescription_item_component(product_id);

CREATE INDEX IF NOT EXISTS idx_prescription_item_occurrence_company_id 
  ON public.prescription_item_occurrence(company_id);

CREATE INDEX IF NOT EXISTS idx_prescription_print_item_company_id 
  ON public.prescription_print_item(company_id);

CREATE INDEX IF NOT EXISTS idx_product_active_ingredient_id 
  ON public.product(active_ingredient_id);

CREATE INDEX IF NOT EXISTS idx_product_group_id 
  ON public.product(group_id);

CREATE INDEX IF NOT EXISTS idx_product_unit_prescription_id 
  ON public.product(unit_prescription_id);

CREATE INDEX IF NOT EXISTS idx_product_unit_stock_id 
  ON public.product(unit_stock_id);

CREATE INDEX IF NOT EXISTS idx_product_group_parent_id 
  ON public.product_group(parent_id);

CREATE INDEX IF NOT EXISTS idx_product_presentation_company_id 
  ON public.product_presentation(company_id);

CREATE INDEX IF NOT EXISTS idx_product_presentation_product_id 
  ON public.product_presentation(product_id);

CREATE INDEX IF NOT EXISTS idx_product_ref_link_company_id 
  ON public.product_ref_link(company_id);

CREATE INDEX IF NOT EXISTS idx_product_ref_link_ref_item_id 
  ON public.product_ref_link(ref_item_id);

CREATE INDEX IF NOT EXISTS idx_product_ref_link_source_id 
  ON public.product_ref_link(source_id);

CREATE INDEX IF NOT EXISTS idx_ref_import_batch_company_id 
  ON public.ref_import_batch(company_id);

CREATE INDEX IF NOT EXISTS idx_ref_import_batch_source_id 
  ON public.ref_import_batch(source_id);

CREATE INDEX IF NOT EXISTS idx_ref_import_error_batch_id 
  ON public.ref_import_error(batch_id);

CREATE INDEX IF NOT EXISTS idx_ref_price_history_import_batch_id 
  ON public.ref_price_history(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_stock_balance_location_id 
  ON public.stock_balance(location_id);

CREATE INDEX IF NOT EXISTS idx_stock_balance_product_id 
  ON public.stock_balance(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_company_id 
  ON public.stock_batch(company_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_location_id 
  ON public.stock_batch(location_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_presentation_id 
  ON public.stock_batch(presentation_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_product_id 
  ON public.stock_batch(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_batch_supplier_id 
  ON public.stock_batch(supplier_id);

CREATE INDEX IF NOT EXISTS idx_stock_location_company_id 
  ON public.stock_location(company_id);

CREATE INDEX IF NOT EXISTS idx_stock_movement_batch_id 
  ON public.stock_movement(batch_id);

CREATE INDEX IF NOT EXISTS idx_stock_movement_company_id 
  ON public.stock_movement(company_id);

CREATE INDEX IF NOT EXISTS idx_stock_movement_location_id 
  ON public.stock_movement(location_id);

CREATE INDEX IF NOT EXISTS idx_stock_movement_presentation_id 
  ON public.stock_movement(presentation_id);

CREATE INDEX IF NOT EXISTS idx_stock_movement_product_id 
  ON public.stock_movement(product_id);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_company_id 
  ON public.user_action_logs(company_id);

-- =====================================================
-- PARTE 4: FIX DUPLICATE INDEX
-- Remove redundant index from user_action_logs
-- =====================================================
SELECT public._drop_index_if_exists_quiet('idx_user_action_logs_user_id_app_user');
DROP FUNCTION IF EXISTS public._drop_index_if_exists_quiet(text, text, boolean);

COMMIT;

