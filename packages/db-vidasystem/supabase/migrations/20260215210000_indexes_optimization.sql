-- =====================================================
-- MIGRATION: Indexes Optimization - Consolidated
--
-- Consolidated to create only required FK indexes in 2 batches.
-- 1. Add missing foreign key indexes (batch 1)
-- 2. Add remaining foreign key indexes (batch 2)
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


CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_id 
  ON public.user_action_logs(user_id);

-- =====================================================
-- PARTE 2: ADD REMAINING FOREIGN KEY INDEXES (BATCH 2)
-- Additional 43 unindexed FKs
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_access_profile_permission_permission_id 
  ON public.access_profile_permission(permission_id);

CREATE INDEX IF NOT EXISTS idx_client_contact_company_id 
  ON public.client_contact(company_id);


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

COMMIT;

