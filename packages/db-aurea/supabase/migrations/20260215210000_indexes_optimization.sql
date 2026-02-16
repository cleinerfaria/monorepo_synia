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

DROP INDEX IF EXISTS idx_presentation_unit CASCADE;

DROP INDEX IF EXISTS idx_ref_import_batch_source CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_company CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_status CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_file_hash CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_created CASCADE;
DROP INDEX IF EXISTS idx_ref_import_batch_cancelled CASCADE;

DROP INDEX IF EXISTS idx_ref_import_error_batch CASCADE;

DROP INDEX IF EXISTS idx_app_user_auth CASCADE;

DROP INDEX IF EXISTS idx_client_ans_code CASCADE;
DROP INDEX IF EXISTS idx_client_tiss CASCADE;

DROP INDEX IF EXISTS idx_professional_company CASCADE;

DROP INDEX IF EXISTS idx_ref_item_company CASCADE;
DROP INDEX IF EXISTS idx_ref_item_external_code CASCADE;
DROP INDEX IF EXISTS idx_ref_item_ean CASCADE;
DROP INDEX IF EXISTS idx_ref_item_product_name CASCADE;
DROP INDEX IF EXISTS idx_ref_item_tiss CASCADE;
DROP INDEX IF EXISTS idx_ref_item_tuss CASCADE;
DROP INDEX IF EXISTS idx_ref_item_manufacturer_code CASCADE;
DROP INDEX IF EXISTS idx_ref_item_category CASCADE;
DROP INDEX IF EXISTS idx_ref_item_active CASCADE;

DROP INDEX IF EXISTS idx_product_company CASCADE;
DROP INDEX IF EXISTS idx_product_type CASCADE;
DROP INDEX IF EXISTS idx_product_active_ingredient CASCADE;
DROP INDEX IF EXISTS idx_product_unit_stock CASCADE;
DROP INDEX IF EXISTS idx_product_unit_prescription CASCADE;
DROP INDEX IF EXISTS idx_product_group CASCADE;

DROP INDEX IF EXISTS idx_equipment_company CASCADE;
DROP INDEX IF EXISTS idx_equipment_status CASCADE;
DROP INDEX IF EXISTS idx_equipment_patient CASCADE;

DROP INDEX IF EXISTS idx_stock_location_company CASCADE;

DROP INDEX IF EXISTS idx_stock_balance_company CASCADE;
DROP INDEX IF EXISTS idx_stock_balance_location CASCADE;
DROP INDEX IF EXISTS idx_stock_balance_product CASCADE;

DROP INDEX IF EXISTS idx_ref_price_history_item CASCADE;
DROP INDEX IF EXISTS idx_ref_price_history_type CASCADE;
DROP INDEX IF EXISTS idx_ref_price_history_valid CASCADE;
DROP INDEX IF EXISTS idx_ref_price_history_item_type_date CASCADE;
DROP INDEX IF EXISTS idx_ref_price_history_import_batch CASCADE;
DROP INDEX IF EXISTS idx_ref_price_history_item_type_valid_created CASCADE;

DROP INDEX IF EXISTS idx_stock_movement_company CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_location CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_product CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_date CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_batch CASCADE;
DROP INDEX IF EXISTS idx_stock_movement_presentation CASCADE;

DROP INDEX IF EXISTS idx_prescription_company CASCADE;
DROP INDEX IF EXISTS idx_prescription_patient CASCADE;
DROP INDEX IF EXISTS idx_prescription_professional CASCADE;
DROP INDEX IF EXISTS idx_prescription_status CASCADE;

DROP INDEX IF EXISTS idx_patient_consumption_company CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_patient CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_product CASCADE;
DROP INDEX IF EXISTS idx_patient_consumption_date CASCADE;

DROP INDEX IF EXISTS idx_product_ref_link_company CASCADE;
DROP INDEX IF EXISTS idx_product_ref_link_product CASCADE;
DROP INDEX IF EXISTS idx_product_ref_link_ref_item CASCADE;
DROP INDEX IF EXISTS idx_product_ref_link_source CASCADE;

DROP INDEX IF EXISTS idx_nfe_import_company CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_status CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_key CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_supplier CASCADE;

DROP INDEX IF EXISTS idx_nfe_import_item_company CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_nfe CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_product_code CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_ean CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_presentation CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_nfe_item_number CASCADE;

DROP INDEX IF EXISTS idx_administration_routes_company CASCADE;
DROP INDEX IF EXISTS idx_administration_routes_active CASCADE;
DROP INDEX IF EXISTS idx_administration_routes_prescription_order CASCADE;

DROP INDEX IF EXISTS idx_presentation_company CASCADE;
DROP INDEX IF EXISTS idx_presentation_product CASCADE;
DROP INDEX IF EXISTS idx_presentation_barcode CASCADE;
DROP INDEX IF EXISTS idx_product_presentation_company_barcode CASCADE;
DROP INDEX IF EXISTS idx_nfe_import_item_product_code CASCADE;

DROP INDEX IF EXISTS idx_active_ingredient_company CASCADE;
DROP INDEX IF EXISTS idx_active_ingredient_name CASCADE;

DROP INDEX IF EXISTS idx_batch_company CASCADE;
DROP INDEX IF EXISTS idx_batch_product CASCADE;
DROP INDEX IF EXISTS idx_batch_location CASCADE;
DROP INDEX IF EXISTS idx_batch_number CASCADE;
DROP INDEX IF EXISTS idx_batch_expiration CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_supplier CASCADE;
DROP INDEX IF EXISTS idx_stock_batch_presentation CASCADE;

DROP INDEX IF EXISTS idx_manufacturer_company CASCADE;
DROP INDEX IF EXISTS idx_manufacturer_name CASCADE;

DROP INDEX IF EXISTS idx_supplier_company CASCADE;
DROP INDEX IF EXISTS idx_supplier_name CASCADE;
DROP INDEX IF EXISTS idx_supplier_document CASCADE;

DROP INDEX IF EXISTS idx_unit_of_measure_company CASCADE;
DROP INDEX IF EXISTS idx_unit_of_measure_company_code CASCADE;
DROP INDEX IF EXISTS idx_unit_of_measure_company_active CASCADE;
DROP INDEX IF EXISTS idx_unit_of_measure_allowed_scopes_gin CASCADE;

DROP INDEX IF EXISTS idx_product_group_company CASCADE;
DROP INDEX IF EXISTS idx_product_group_parent CASCADE;
DROP INDEX IF EXISTS idx_product_group_active CASCADE;

DROP INDEX IF EXISTS idx_patient_company CASCADE;
DROP INDEX IF EXISTS idx_patient_billing_client CASCADE;
DROP INDEX IF EXISTS idx_patient_name CASCADE;

DROP INDEX IF EXISTS idx_patient_address_company CASCADE;
DROP INDEX IF EXISTS idx_patient_address_patient CASCADE;
DROP INDEX IF EXISTS idx_patient_address_patient_active CASCADE;
DROP INDEX IF EXISTS idx_patient_address_patient_city CASCADE;
DROP INDEX IF EXISTS idx_patient_address_use_for_service CASCADE;
DROP INDEX IF EXISTS idx_patient_address_geolocation CASCADE;

DROP INDEX IF EXISTS idx_patient_contact_company CASCADE;
DROP INDEX IF EXISTS idx_patient_contact_patient CASCADE;
DROP INDEX IF EXISTS idx_patient_contact_patient_type CASCADE;

DROP INDEX IF EXISTS idx_patient_identifier_company CASCADE;
DROP INDEX IF EXISTS idx_patient_identifier_patient CASCADE;
DROP INDEX IF EXISTS idx_patient_identifier_patient_source CASCADE;

DROP INDEX IF EXISTS idx_patient_payer_company CASCADE;
DROP INDEX IF EXISTS idx_patient_payer_patient CASCADE;
DROP INDEX IF EXISTS idx_patient_payer_client CASCADE;
DROP INDEX IF EXISTS idx_patient_payer_patient_active CASCADE;

DROP INDEX IF EXISTS idx_client_contact_company CASCADE;
DROP INDEX IF EXISTS idx_client_contact_client CASCADE;
DROP INDEX IF EXISTS idx_client_contact_client_type CASCADE;

DROP INDEX IF EXISTS idx_user_action_logs_company_date CASCADE;
DROP INDEX IF EXISTS idx_user_action_logs_company_entity_date CASCADE;
DROP INDEX IF EXISTS idx_user_action_logs_company_user_date CASCADE;

DROP INDEX IF EXISTS idx_mv_known_products_ref_prices_price_date CASCADE;
DROP INDEX IF EXISTS idx_mv_known_products_ref_company_ean CASCADE;
DROP INDEX IF EXISTS idx_mv_known_products_ref_last_refresh CASCADE;

DROP INDEX IF EXISTS idx_procedure_company CASCADE;
DROP INDEX IF EXISTS idx_procedure_company_category CASCADE;

DROP INDEX IF EXISTS idx_prescription_item_company CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_prescription CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_order CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_company_is_active CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_company_type CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_company_week_days_gin CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_route_id CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_company_supplier CASCADE;

DROP INDEX IF EXISTS idx_prescription_item_component_company CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_component_item CASCADE;
DROP INDEX IF EXISTS idx_prescription_item_component_product CASCADE;

DROP INDEX IF EXISTS idx_prescription_print_company_created CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_company_prescription_created CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_company_prescription_period CASCADE;

DROP INDEX IF EXISTS idx_prescription_print_item_company_print CASCADE;

DROP INDEX IF EXISTS idx_prescription_print_payload_content_company_content_hash CASCADE;
DROP INDEX IF EXISTS idx_prescription_print_item_content_company_content_hash CASCADE;

DROP INDEX IF EXISTS idx_occurrence_company_patient_time CASCADE;
DROP INDEX IF EXISTS idx_occurrence_prescription_item CASCADE;
DROP INDEX IF EXISTS idx_occurrence_pending CASCADE;

DROP INDEX IF EXISTS idx_company_parent_id CASCADE;

DROP INDEX IF EXISTS idx_access_profile_permission_profile CASCADE;
DROP INDEX IF EXISTS idx_access_profile_permission_permission CASCADE;

DROP INDEX IF EXISTS idx_ref_item_company_ean CASCADE;

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

DROP INDEX IF EXISTS idx_user_action_logs_user_id_app_user CASCADE;

COMMIT;
