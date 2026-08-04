create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('website','pdf','text','integration')),
  name text not null,
  source_url text,
  status text not null default 'processing' check (status in ('processing','ready','failed','paused')),
  content text not null default '',
  page_count integer not null default 0,
  byte_size bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.help_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  custom_domain text,
  accent text not null default '#ff5c35',
  is_published boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider text not null default 'twilio',
  outbound_number text,
  recording_enabled boolean not null default false,
  consent_prompt text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_sources enable row level security;
alter table public.help_centers enable row level security;
alter table public.voice_settings enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['knowledge_sources','help_centers','voice_settings']
  loop
    execute format('drop policy if exists "tenant_select" on public.%I', table_name);
    execute format('create policy "tenant_select" on public.%I for select using (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_insert" on public.%I', table_name);
    execute format('create policy "tenant_insert" on public.%I for insert with check (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_update" on public.%I', table_name);
    execute format('create policy "tenant_update" on public.%I for update using (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_delete" on public.%I', table_name);
    execute format('create policy "tenant_delete" on public.%I for delete using (organization_id in (select public.user_organization_ids()))', table_name);
  end loop;
end $$;

drop policy if exists "published_help_centers_read" on public.help_centers;
create policy "published_help_centers_read" on public.help_centers for select using (is_published = true);

drop trigger if exists knowledge_sources_set_updated_at on public.knowledge_sources;
create trigger knowledge_sources_set_updated_at before update on public.knowledge_sources for each row execute procedure public.set_updated_at();
drop trigger if exists help_centers_set_updated_at on public.help_centers;
create trigger help_centers_set_updated_at before update on public.help_centers for each row execute procedure public.set_updated_at();
drop trigger if exists voice_settings_set_updated_at on public.voice_settings;
create trigger voice_settings_set_updated_at before update on public.voice_settings for each row execute procedure public.set_updated_at();
