
DROP INDEX IF EXISTS public.uq_business_partner_company_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_partner_company_code
ON public.business_partner (company_id, code);



