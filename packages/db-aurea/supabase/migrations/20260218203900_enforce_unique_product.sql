drop index if exists public.idx_product_code_unique;
alter table public.product add constraint uq_product_company_code unique (company_id, code);