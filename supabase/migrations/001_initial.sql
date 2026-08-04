create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  support_email text,
  plan text not null default 'trial' check (plan in ('trial','start','scale','control')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner','admin','agent','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.user_organization_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id from public.memberships where user_id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.add_organization_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.memberships (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created after insert on public.organizations
for each row execute procedure public.add_organization_owner();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text,
  name text not null,
  company text,
  external_id text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.inboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('email','chat','form','api','whatsapp')),
  address text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inbox_id uuid references public.inboxes(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  subject text,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  ai_state text not null default 'eligible' check (ai_state in ('eligible','drafting','resolved','handed_off','disabled')),
  sentiment text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_org_status_idx on public.conversations(organization_id, status, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('contact','agent','ai','system')),
  sender_id uuid,
  body text not null,
  is_internal boolean not null default false,
  ai_metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text not null,
  body text not null default '',
  collection text,
  status text not null default 'draft' check (status in ('draft','approved','archived','needs_review')),
  source_url text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger_config jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  run_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  credentials_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null,
  status text not null default 'created',
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id bigint generated by default as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_org_time_idx on public.usage_events(organization_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','organizations','memberships','contacts','inboxes','conversations','messages','knowledge_articles','automations','integrations','subscriptions','usage_events']
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid());

drop policy if exists "organizations_insert_owner" on public.organizations;
create policy "organizations_insert_owner" on public.organizations for insert with check (owner_id = auth.uid());
drop policy if exists "organizations_member_access" on public.organizations;
create policy "organizations_member_access" on public.organizations for select using (id in (select public.user_organization_ids()));
drop policy if exists "organizations_owner_update" on public.organizations;
create policy "organizations_owner_update" on public.organizations for update using (owner_id = auth.uid());

drop policy if exists "memberships_member_read" on public.memberships;
create policy "memberships_member_read" on public.memberships for select using (organization_id in (select public.user_organization_ids()));

do $$
declare table_name text;
begin
  foreach table_name in array array['contacts','inboxes','conversations','messages','knowledge_articles','automations','integrations','subscriptions','usage_events']
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute procedure public.set_updated_at();
drop trigger if exists knowledge_set_updated_at on public.knowledge_articles;
create trigger knowledge_set_updated_at before update on public.knowledge_articles for each row execute procedure public.set_updated_at();
