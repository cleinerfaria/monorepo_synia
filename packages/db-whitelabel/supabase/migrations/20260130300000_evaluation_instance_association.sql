-- Relacionamento N:N entre avaliação e instância
-- Sem registros aqui => avaliação vale para todas as instâncias

create table if not exists public.evaluation_instance (
  company_id uuid not null references public.company(id) on delete cascade,
  evaluation_id uuid not null references public.evaluation(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instance(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, evaluation_id, instance_id)
);

create index if not exists idx_evaluation_instance_evaluation
on public.evaluation_instance(company_id, evaluation_id);

create index if not exists idx_evaluation_instance_instance
on public.evaluation_instance(company_id, instance_id);

create trigger trg_evaluation_instance_updated_at
before update on public.evaluation_instance
for each row
execute function public.update_updated_at_column();

alter table public.evaluation_instance enable row level security;
alter table public.evaluation_instance force row level security;

-- Policies (padrão do seu módulo: company scope + superadmin)

create policy "evaluation_instance_select"
on public.evaluation_instance
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_instance_insert"
on public.evaluation_instance
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_instance_update"
on public.evaluation_instance
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_instance_delete"
on public.evaluation_instance
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

comment on table public.evaluation_instance is
'Relacionamento N:N entre avaliações e instâncias. Se uma avaliação não tiver registros aqui, ela pode ser usada em todas as instâncias.';
