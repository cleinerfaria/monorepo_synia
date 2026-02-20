-- =====================================================
-- VIDASYSTEM CARE - RLS policies for client/patient accessories
-- Adds RLS to client_contact, patient_address, patient_contact,
-- patient_identifier, and patient_payer
-- =====================================================

ALTER TABLE public.client_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_identifier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_payer ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES FOR CLIENT_CONTACT
-- =====================================================

CREATE POLICY "Users can view client contacts in their company"
    ON public.client_contact FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert client contacts in their company"
    ON public.client_contact FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update client contacts in their company"
    ON public.client_contact FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete client contacts in their company"
    ON public.client_contact FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLICIES FOR PATIENT_ADDRESS
-- =====================================================

CREATE POLICY "Users can view patient addresses in their company"
    ON public.patient_address FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patient addresses in their company"
    ON public.patient_address FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patient addresses in their company"
    ON public.patient_address FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patient addresses in their company"
    ON public.patient_address FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLICIES FOR PATIENT_CONTACT
-- =====================================================

CREATE POLICY "Users can view patient contacts in their company"
    ON public.patient_contact FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patient contacts in their company"
    ON public.patient_contact FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patient contacts in their company"
    ON public.patient_contact FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patient contacts in their company"
    ON public.patient_contact FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLICIES FOR PATIENT_IDENTIFIER
-- =====================================================

CREATE POLICY "Users can view patient identifiers in their company"
    ON public.patient_identifier FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patient identifiers in their company"
    ON public.patient_identifier FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patient identifiers in their company"
    ON public.patient_identifier FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patient identifiers in their company"
    ON public.patient_identifier FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLICIES FOR PATIENT_PAYER
-- =====================================================

CREATE POLICY "Users can view patient payers in their company"
    ON public.patient_payer FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patient payers in their company"
    ON public.patient_payer FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patient payers in their company"
    ON public.patient_payer FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patient payers in their company"
    ON public.patient_payer FOR DELETE
    USING (company_id = get_user_company_id());
