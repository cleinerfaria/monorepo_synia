do $$
begin

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_instance_status') then
    create type public.enum_whatsapp_instance_status as enum (
      'disconnected',
      'connecting',
      'connected',
      'error'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_message_type') then
    create type public.enum_whatsapp_message_type as enum (
      'text',
      'image',
      'audio',
      'video',
      'document',
      'sticker',
      'location',
      'contact',
      'reaction',
      'unknown'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_message_status') then
    create type public.enum_whatsapp_message_status as enum (
      'sent',
      'delivered',
      'read',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_session_status') then
    create type public.enum_whatsapp_session_status as enum (
      'pending',
      'evaluated',
      'ignored'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_session_created_mode') then
    create type public.enum_whatsapp_session_created_mode as enum (
      'automatic',
      'manual'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_session_evaluation_status') then
    create type public.enum_whatsapp_session_evaluation_status as enum (
      'pending',
      'processing',
      'done',
      'error'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'enum_whatsapp_provider') then
    create type public.enum_whatsapp_provider as enum (
      'uazapi'
    );
  end if;

end
$$;

