-- =====================================================
-- WHATSAPP MODULE - TABLES, RLS, RBAC, PLAN SETTINGS (PROVIDER-AGNOSTIC)
-- =====================================================
-- Objetivo:
-- - Implementar um módulo de WhatsApp "tipo WhatsApp Web" com:
--   - Instâncias (telefones/conexões)
--   - Contatos
--   - Conversas (threads/chats)
--   - Mensagens
--   - Mídias
--   - Sessões de atendimento (cortes) para futuras avaliações por IA
--   - Avaliações e Aspectos (critérios)
-- - Multi-tenant seguro via RLS (company_id)
-- - RBAC para operações sensíveis (ex: gerenciar instâncias)
-- - Preparado para trocar o provider no futuro (sem nome de fornecedor no schema)
-- Observação:
-- - ENUMs já foram criados em migration separada (não criar aqui).
--   Esperados:
--     public.enum_whatsapp_instance_status
--     public.enum_whatsapp_message_type
--     public.enum_whatsapp_message_status
--     public.enum_whatsapp_session_status
--     public.enum_whatsapp_session_created_mode
--     public.enum_whatsapp_session_evaluation_status
-- =====================================================

-- =====================================================
-- 0) HELPERS
-- =====================================================
-- Função auxiliar para verificar se o usuário logado tem papel "manager".
-- Motivo:
-- - Algumas operações (ex: instâncias) exigem permissões elevadas.
-- - Mantemos isso server-side no banco para reforçar a segurança.
-- Observação:
-- - SECURITY DEFINER permite executar a função com permissões do owner.
-- - search_path fixo evita ataques via objetos com mesmo nome em outro schema.
create or replace function public.is_user_manager()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  has_manager_access boolean;
begin
  select COALESCE(ap.is_admin, FALSE) OR ap.code = 'manager'
    into has_manager_access
  from public.app_user au
  left join public.access_profile ap
    on ap.id = au.access_profile_id
  where au.auth_user_id = auth.uid();

  return has_manager_access = TRUE;
end;
$$;

-- Restringe acesso público à função; apenas usuários autenticados podem executar.
revoke all on function public.is_user_manager() from public;
grant execute on function public.is_user_manager() to authenticated;

-- =====================================================
-- 1) PLAN SETTINGS
-- =====================================================
-- Configurações de plano por empresa (multi-tenant).
-- Motivo:
-- - O SaaS possui limite de instâncias WhatsApp por empresa (ex: 1, 3, 10).
-- - Apenas superadmin pode alterar.
create table if not exists public.company_plan_settings (
  company_id uuid primary key references public.company(id) on delete cascade,
  whatsapp_instance_limit integer not null default 1,
  ia_token_limit integer not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger padrão do projeto para manter updated_at sempre atualizado.
create trigger trg_company_plan_settings_updated_at
before update on public.company_plan_settings
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- 2) WHATSAPP CORE TABLES
-- =====================================================

-- -----------------------------------------------------
-- 2.1) whatsapp_instance
-- -----------------------------------------------------
-- Representa uma conexão/instância do WhatsApp (por telefone / sessão).
-- Importante:
-- - provider + provider_instance_id guardam a identidade no provedor externo.
-- - Token/segredo NÃO fica aqui (vai pra whatsapp_instance_secret).
create table if not exists public.whatsapp_instance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  provider public.enum_whatsapp_provider not null default 'uazapi',
  provider_instance_id text not null,
  name text not null,
  sector text,
  observation text,
  phone_number text,
  status public.enum_whatsapp_instance_status not null default 'disconnected',
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider, provider_instance_id)
);

-- Índices principais:
-- - company_id: listar instâncias por empresa
-- - (company_id, active): contar instâncias ativas (enforcement e UI)
-- - status: filtros rápidos (conectado, erro, etc.)
create index if not exists idx_whatsapp_instance_company
on public.whatsapp_instance(company_id);

create index if not exists idx_whatsapp_instance_company_active
on public.whatsapp_instance(company_id, active);

create index if not exists idx_whatsapp_instance_status
on public.whatsapp_instance(status);

-- updated_at automático
create trigger trg_whatsapp_instance_updated_at
before update on public.whatsapp_instance
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.2) whatsapp_instance_secret
-- -----------------------------------------------------
-- Armazena segredos de integração (token/credencial) por instância.
-- Motivo:
-- - Evitar vazamento acidental por SELECT no front/queries comuns.
-- - RLS aqui será "somente superadmin".
create table if not exists public.whatsapp_instance_secret (
  instance_id uuid primary key references public.whatsapp_instance(id) on delete cascade,
  company_id uuid not null references public.company(id) on delete cascade,
  provider public.enum_whatsapp_provider not null default 'uazapi',
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider, instance_id)
);

create index if not exists idx_whatsapp_instance_secret_company
on public.whatsapp_instance_secret(company_id);

create trigger trg_whatsapp_instance_secret_updated_at
before update on public.whatsapp_instance_secret
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.3) whatsapp_contact
-- -----------------------------------------------------
-- Contatos espelhados do WhatsApp.
-- external_jid:
-- - identificador principal no WhatsApp (ex: 5584...@s.whatsapp.net)
-- external_lid:
-- - identificador alternativo (ex: 2121...@lid)
-- Observação:
-- - Alguns providers/eventos podem trazer apenas um deles; manter ambos evita duplicidade.
create table if not exists public.whatsapp_contact (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  external_jid text,
  external_lid text,
  phone_number text,
  display_name text,
  profile_pic_url text,
  is_group boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_whatsapp_contact_external_ids check (
    external_jid is not null
    or external_lid is not null
  )
);

COMMENT ON COLUMN public.whatsapp_contact.is_group
IS 'Indica se o contato representa um grupo do WhatsApp';

COMMENT ON COLUMN public.whatsapp_contact.is_archived
IS 'Indica se o contato está arquivado no WhatsApp';

-- Unicidade por empresa, separando por tipo de identificador
create unique index if not exists uq_whatsapp_contact_company_external_jid
on public.whatsapp_contact(company_id, external_jid)
where external_jid is not null;

create unique index if not exists uq_whatsapp_contact_company_external_lid
on public.whatsapp_contact(company_id, external_lid)
where external_lid is not null;

-- Índices para busca
create index if not exists idx_whatsapp_contact_company
on public.whatsapp_contact(company_id);

create index if not exists idx_whatsapp_contact_company_phone
on public.whatsapp_contact(company_id, phone_number);

create trigger trg_whatsapp_contact_updated_at
before update on public.whatsapp_contact
for each row
execute function public.update_updated_at_column();


-- -----------------------------------------------------
-- 2.4) whatsapp_conversation
-- -----------------------------------------------------
-- Thread/Chat entre instância e contato.
-- Modelagem:
-- - (company_id, instance_id, contact_id) é único: 1 thread por contato por instância.
-- - wa_chatid opcional: se o provider disponibilizar, dá pra indexar por chatid também.
-- last_message_at:
-- - ordenação da lista de chats no estilo WhatsApp Web.
create table if not exists public.whatsapp_conversation (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instance(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contact(id) on delete cascade,
  wa_chatid text,
  external_id text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, instance_id, contact_id)
);

-- ChatId único quando disponível (evita duplicidade e facilita upsert por chatid)
create unique index if not exists uq_whatsapp_conversation_company_instance_chatid
on public.whatsapp_conversation(company_id, instance_id, wa_chatid)
where wa_chatid is not null;

-- Índices para UI:
-- - lista por instância
-- - filtro por contato
-- - ordenação por último evento
create index if not exists idx_whatsapp_conversation_company
on public.whatsapp_conversation(company_id);

create index if not exists idx_whatsapp_conversation_instance
on public.whatsapp_conversation(instance_id);

create index if not exists idx_whatsapp_conversation_contact
on public.whatsapp_conversation(contact_id);

create index if not exists idx_whatsapp_conversation_company_last_message
on public.whatsapp_conversation(company_id, last_message_at desc);

create trigger trg_whatsapp_conversation_updated_at
before update on public.whatsapp_conversation
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.5) whatsapp_message
-- -----------------------------------------------------
-- Mensagens da conversa.
-- sent_ts:
-- - epoch (segundos) vindo do provider; ideal para paginação e ordenação estável.
-- sent_at:
-- - timestamptz para facilitar filtros por data no SQL.
-- unique (company_id, instance_id, external_id):
-- - evita colisão quando várias instâncias existem dentro da mesma empresa.
create table if not exists public.whatsapp_message (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversation(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instance(id) on delete cascade,
  contact_id uuid references public.whatsapp_contact(id) on delete set null,
  external_id text not null,
  from_me boolean not null default false,
  message_type public.enum_whatsapp_message_type not null default 'unknown',
  text_content text,
  sent_ts bigint not null,
  sent_at timestamptz,
  status public.enum_whatsapp_message_status,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, instance_id, external_id)
);

-- Índices para UI e paginação:
-- - buscar por conversa
-- - paginação por timestamp desc
create index if not exists idx_whatsapp_message_company
on public.whatsapp_message(company_id);

create index if not exists idx_whatsapp_message_conversation
on public.whatsapp_message(conversation_id);

create index if not exists idx_whatsapp_message_instance
on public.whatsapp_message(instance_id);

create index if not exists idx_whatsapp_message_contact
on public.whatsapp_message(contact_id);

create index if not exists idx_whatsapp_message_company_conversation_ts
on public.whatsapp_message(company_id, conversation_id, sent_ts desc);

create trigger trg_whatsapp_message_updated_at
before update on public.whatsapp_message
for each row
execute function public.update_updated_at_column();

-- Trigger para preencher sent_at automaticamente quando só vier sent_ts.
-- Motivo:
-- - O webhook pode mandar apenas timestamp numérico; mantemos consistência no banco.
create or replace function public.whatsapp_message_fill_sent_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sent_at is null then
    new.sent_at := to_timestamp(new.sent_ts);
  end if;
  return new;
end;
$$;

revoke all on function public.whatsapp_message_fill_sent_at() from public;
grant execute on function public.whatsapp_message_fill_sent_at() to authenticated;

create trigger trg_whatsapp_message_fill_sent_at
before insert or update of sent_ts, sent_at on public.whatsapp_message
for each row
execute function public.whatsapp_message_fill_sent_at();

-- -----------------------------------------------------
-- 2.6) whatsapp_media
-- -----------------------------------------------------
-- Mídias associadas à mensagem:
-- - url: link temporário ou remoto
-- - storage_path: caminho no seu storage (ex: Supabase Storage)
-- - checksum: deduplicação/validação
create table if not exists public.whatsapp_media (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  message_id uuid not null references public.whatsapp_message(id) on delete cascade,
  media_type text,
  mime_type text,
  file_name text,
  size_bytes bigint,
  url text,
  storage_path text,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_media_company
on public.whatsapp_media(company_id);

create index if not exists idx_whatsapp_media_message
on public.whatsapp_media(message_id);

create trigger trg_whatsapp_media_updated_at
before update on public.whatsapp_media
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.7) whatsapp_session (cortes de atendimento)
-- -----------------------------------------------------
-- Sessões representam “períodos” de atendimento (cutoffs), usados para avaliação.
-- start_message_id / end_message_id:
-- - permitem delimitar a janela exata (para IA e auditoria)
-- created_mode:
-- - automatic/manual (separação automática ou criada pelo operador)
create table if not exists public.whatsapp_session (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversation(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instance(id) on delete cascade,
  operator_user_id uuid references public.app_user(id) on delete set null,
  start_message_id uuid references public.whatsapp_message(id) on delete set null,
  end_message_id uuid references public.whatsapp_message(id) on delete set null,
  start_at timestamptz,
  end_at timestamptz,
  status public.enum_whatsapp_session_status not null default 'pending',
  created_by uuid references public.app_user(id) on delete set null,
  created_mode public.enum_whatsapp_session_created_mode not null default 'automatic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_session_company
on public.whatsapp_session(company_id);

create index if not exists idx_whatsapp_session_conversation
on public.whatsapp_session(conversation_id);

create index if not exists idx_whatsapp_session_instance
on public.whatsapp_session(instance_id);

create index if not exists idx_whatsapp_session_start_at
on public.whatsapp_session(start_at desc);

create index if not exists idx_whatsapp_session_end_at
on public.whatsapp_session(end_at desc);

create trigger trg_whatsapp_session_updated_at
before update on public.whatsapp_session
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.8) evaluation e evaluation_aspect
-- -----------------------------------------------------
-- evaluation:
-- - conjunto de critérios aplicados a sessões (ex: "Atendimento padrão")
-- evaluation_aspect:
-- - itens avaliados (ex: "Cordialidade", "Tempo de resposta", "Clareza")
create table if not exists public.evaluation (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evaluation_company
on public.evaluation(company_id);

create trigger trg_evaluation_updated_at
before update on public.evaluation
for each row
execute function public.update_updated_at_column();

create table if not exists public.evaluation_aspect (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  evaluation_id uuid not null references public.evaluation(id) on delete cascade,
  name text not null,
  instructions text,
  weight numeric,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, evaluation_id, name)
);

create index if not exists idx_evaluation_aspect_company
on public.evaluation_aspect(company_id);

create index if not exists idx_evaluation_aspect_evaluation
on public.evaluation_aspect(evaluation_id);

create trigger trg_evaluation_aspect_updated_at
before update on public.evaluation_aspect
for each row
execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 2.9) whatsapp_session_evaluation
-- -----------------------------------------------------
-- Resultado de avaliação da sessão.
-- status:
-- - pipeline de processamento (pending -> processing -> done/error)
-- result:
-- - JSONB com notas, justificativas, etc.
create table if not exists public.whatsapp_session_evaluation (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  session_id uuid not null unique references public.whatsapp_session(id) on delete cascade,
  evaluation_id uuid references public.evaluation(id) on delete set null,
  status public.enum_whatsapp_session_evaluation_status not null default 'pending',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_session_eval_company
on public.whatsapp_session_evaluation(company_id);

create index if not exists idx_whatsapp_session_eval_session
on public.whatsapp_session_evaluation(session_id);

create index if not exists idx_whatsapp_session_eval_evaluation
on public.whatsapp_session_evaluation(evaluation_id);

create trigger trg_whatsapp_session_evaluation_updated_at
before update on public.whatsapp_session_evaluation
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- 2.10) ENFORCE INSTANCE LIMIT (DB-LEVEL)
-- =====================================================
-- Garante no banco que a empresa não ultrapasse o limite de instâncias ativas.
-- Motivo:
-- - Blindar regra de negócio, evitando bypass por bug no backend ou uso direto via SQL.
create or replace function public.enforce_whatsapp_instance_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select cps.whatsapp_instance_limit into v_limit
  from public.company_plan_settings cps
  where cps.company_id = new.company_id;

  if v_limit is null then
    v_limit := 1;
  end if;

  if tg_op = 'INSERT' then
    if new.active is true then
      select count(*) into v_count
      from public.whatsapp_instance wi
      where wi.company_id = new.company_id
        and wi.active is true;

      if v_count >= v_limit then
        raise exception 'WhatsApp instance limit reached (%/%).', v_count, v_limit using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (old.active is distinct from new.active) and new.active is true then
      select count(*) into v_count
      from public.whatsapp_instance wi
      where wi.company_id = new.company_id
        and wi.active is true
        and wi.id <> new.id;

      if v_count >= v_limit then
        raise exception 'WhatsApp instance limit reached (%/%).', v_count, v_limit using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_whatsapp_instance_limit() from public;
grant execute on function public.enforce_whatsapp_instance_limit() to authenticated;

create trigger trg_whatsapp_instance_limit
before insert or update of active on public.whatsapp_instance
for each row
execute function public.enforce_whatsapp_instance_limit();

-- =====================================================
-- 3) RLS POLICIES
-- =====================================================
-- Estratégia:
-- - FORCE RLS em todas as tabelas do módulo
-- - company_id = get_user_company_id() para usuários comuns
-- - superadmin tem acesso global
-- - tabela de segredos: somente superadmin
alter table public.company_plan_settings enable row level security;
alter table public.company_plan_settings force row level security;

alter table public.whatsapp_instance enable row level security;
alter table public.whatsapp_instance force row level security;

alter table public.whatsapp_instance_secret enable row level security;
alter table public.whatsapp_instance_secret force row level security;

alter table public.whatsapp_contact enable row level security;
alter table public.whatsapp_contact force row level security;

alter table public.whatsapp_conversation enable row level security;
alter table public.whatsapp_conversation force row level security;

alter table public.whatsapp_message enable row level security;
alter table public.whatsapp_message force row level security;

alter table public.whatsapp_media enable row level security;
alter table public.whatsapp_media force row level security;

alter table public.whatsapp_session enable row level security;
alter table public.whatsapp_session force row level security;

alter table public.evaluation enable row level security;
alter table public.evaluation force row level security;

alter table public.evaluation_aspect enable row level security;
alter table public.evaluation_aspect force row level security;

alter table public.whatsapp_session_evaluation enable row level security;
alter table public.whatsapp_session_evaluation force row level security;

-- -----------------------------------------------------
-- 3.1) company_plan_settings policies
-- -----------------------------------------------------
-- Apenas superadmin pode inserir/alterar/excluir.
-- Usuários da empresa podem ler (para UI, ex: exibir limite/uso), ou superadmin.

create policy "company_plan_settings_select"
on public.company_plan_settings
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "company_plan_settings_insert"
on public.company_plan_settings
for insert
to authenticated
with check (public.is_superadmin());

create policy "company_plan_settings_update"
on public.company_plan_settings
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "company_plan_settings_delete"
on public.company_plan_settings
for delete
to authenticated
using (public.is_superadmin());

-- -----------------------------------------------------
-- 3.2) whatsapp_instance policies (RBAC)
-- -----------------------------------------------------
-- SELECT:
-- - usuários da empresa ou superadmin
-- INSERT/UPDATE/DELETE:
-- - superadmin
-- - ou usuário da empresa com: admin, manager ou permissão 'whatsapp/manage_instances'

create policy "whatsapp_instance_select"
on public.whatsapp_instance
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_instance_insert"
on public.whatsapp_instance
for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    company_id = public.get_user_company_id()
    and (public.is_user_admin() or public.is_user_manager() or public.has_permission(auth.uid(), 'whatsapp', 'manage_instances'))
  )
);

create policy "whatsapp_instance_update"
on public.whatsapp_instance
for update
to authenticated
using (
  public.is_superadmin()
  or (
    company_id = public.get_user_company_id()
    and (public.is_user_admin() or public.is_user_manager() or public.has_permission(auth.uid(), 'whatsapp', 'manage_instances'))
  )
)
with check (
  public.is_superadmin()
  or (
    company_id = public.get_user_company_id()
    and (public.is_user_admin() or public.is_user_manager() or public.has_permission(auth.uid(), 'whatsapp', 'manage_instances'))
  )
);

create policy "whatsapp_instance_delete"
on public.whatsapp_instance
for delete
to authenticated
using (
  public.is_superadmin()
  or (
    company_id = public.get_user_company_id()
    and (public.is_user_admin() or public.is_user_manager() or public.has_permission(auth.uid(), 'whatsapp', 'manage_instances'))
  )
);

-- -----------------------------------------------------
-- 3.3) whatsapp_instance_secret policies
-- -----------------------------------------------------
-- Secrets só podem ser lidos e alterados por superadmin.

create policy "whatsapp_instance_secret_select"
on public.whatsapp_instance_secret
for select
to authenticated
using (public.is_superadmin());

create policy "whatsapp_instance_secret_insert"
on public.whatsapp_instance_secret
for insert
to authenticated
with check (public.is_superadmin());

create policy "whatsapp_instance_secret_update"
on public.whatsapp_instance_secret
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "whatsapp_instance_secret_delete"
on public.whatsapp_instance_secret
for delete
to authenticated
using (public.is_superadmin());

-- -----------------------------------------------------
-- 3.4) Demais tabelas: regra company scope padrão
-- -----------------------------------------------------
-- Regra:
-- - superadmin vê tudo
-- - usuário comum vê apenas registros da própria empresa
-- Observação:
-- - Aqui mantemos insert/update/delete liberados para company scope,
--   pois o backend (service_role) normalmente realiza ingestão via webhook.
--   Se você quiser travar no futuro, dá para colocar RBAC também.

create policy "whatsapp_contact_select"
on public.whatsapp_contact
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_contact_insert"
on public.whatsapp_contact
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_contact_update"
on public.whatsapp_contact
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_contact_delete"
on public.whatsapp_contact
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "whatsapp_conversation_select"
on public.whatsapp_conversation
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_conversation_insert"
on public.whatsapp_conversation
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_conversation_update"
on public.whatsapp_conversation
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_conversation_delete"
on public.whatsapp_conversation
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "whatsapp_message_select"
on public.whatsapp_message
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_message_insert"
on public.whatsapp_message
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_message_update"
on public.whatsapp_message
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_message_delete"
on public.whatsapp_message
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "whatsapp_media_select"
on public.whatsapp_media
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_media_insert"
on public.whatsapp_media
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_media_update"
on public.whatsapp_media
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_media_delete"
on public.whatsapp_media
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "whatsapp_session_select"
on public.whatsapp_session
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_insert"
on public.whatsapp_session
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_update"
on public.whatsapp_session
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_delete"
on public.whatsapp_session
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "evaluation_select"
on public.evaluation
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_insert"
on public.evaluation
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_update"
on public.evaluation
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_delete"
on public.evaluation
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "evaluation_aspect_select"
on public.evaluation_aspect
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_aspect_insert"
on public.evaluation_aspect
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_aspect_update"
on public.evaluation_aspect
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "evaluation_aspect_delete"
on public.evaluation_aspect
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());


create policy "whatsapp_session_evaluation_select"
on public.whatsapp_session_evaluation
for select
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_evaluation_insert"
on public.whatsapp_session_evaluation
for insert
to authenticated
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_evaluation_update"
on public.whatsapp_session_evaluation
for update
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id())
with check (public.is_superadmin() or company_id = public.get_user_company_id());

create policy "whatsapp_session_evaluation_delete"
on public.whatsapp_session_evaluation
for delete
to authenticated
using (public.is_superadmin() or company_id = public.get_user_company_id());
