-- ResolveX 2.0: tenant-scoped AI workforce, voice, CRM, approvals, and ledgers.
-- This migration is additive. Existing inbox, auth, knowledge, and billing rows are preserved.

create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  template_type text not null check (template_type in ('support','receptionist','sales','customer_success','custom')),
  description text not null default '',
  instructions text not null default '',
  status text not null default 'draft' check (status in ('draft','testing','active','paused','archived','provisioning','failed')),
  voice_id text,
  languages text[] not null default array['en']::text[],
  knowledge_source_ids uuid[] not null default '{}',
  connected_toolkits text[] not null default '{}',
  assigned_channels text[] not null default array['chat']::text[],
  working_hours jsonb not null default '{"timezone":"UTC","schedule":[]}'::jsonb,
  escalation_rules jsonb not null default '{"always_allow_human":true}'::jsonb,
  usage_budget_cents integer not null default 2500 check (usage_budget_cents >= 0),
  provider text,
  external_agent_id text,
  provisioning_key uuid not null default gen_random_uuid(),
  provisioned_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create unique index if not exists ai_employees_external_agent_idx
  on public.ai_employees(provider, external_agent_id)
  where external_agent_id is not null;
create index if not exists ai_employees_org_status_idx
  on public.ai_employees(organization_id, status, created_at desc);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.contacts
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists phone text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create table if not exists public.contact_identifiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind text not null check (kind in ('email','phone','whatsapp','instagram','facebook','external')),
  value text not null,
  verified_at timestamptz,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, kind, value)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  pipeline text not null default 'Sales',
  stage text not null default 'New',
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  owner_id uuid references auth.users(id) on delete set null,
  expected_close_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  external_provider text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','email','message','note','meeting','task','deal','appointment','system')),
  title text not null,
  summary text,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'plivo',
  e164 text not null,
  country text not null,
  number_type text,
  status text not null default 'pending_authorization' check (status in ('pending_authorization','pending_compliance','provisioning','active','failed','released')),
  external_id text,
  monthly_cost_minor bigint,
  currency text,
  assigned_employee_ids uuid[] not null default '{}',
  compliance_status text not null default 'not_required' check (compliance_status in ('not_required','pending','accepted','rejected')),
  idempotency_key uuid not null default gen_random_uuid(),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, e164)
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  phone_number_id uuid references public.phone_numbers(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider text not null default 'plivo',
  external_call_id text,
  direction text not null check (direction in ('inbound','outbound')),
  handler_type text not null default 'ai' check (handler_type in ('ai','human','mixed')),
  from_number text,
  to_number text,
  status text not null default 'queued' check (status in ('queued','ringing','in_progress','completed','missed','failed','transferred','abandoned')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  summary text,
  transcript text,
  recording_url text,
  outcome text,
  cost_minor bigint not null default 0,
  currency text not null default 'USD',
  consent_recorded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_call_id)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  action_type text not null,
  title text not null,
  risk text not null default 'medium' check (risk in ('low','medium','high','critical')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired','executed','failed')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_employee_id uuid references public.ai_employees(id) on delete cascade,
  toolkit text not null,
  tool_slug text not null,
  access text not null default 'approval_required' check (access in ('allow','approval_required','deny')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ai_employee_id, toolkit, tool_slug)
);

create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  approval_id uuid references public.approval_requests(id) on delete set null,
  integration_id uuid references public.integrations(id) on delete set null,
  toolkit text not null,
  tool_slug text not null,
  status text not null check (status in ('pending_approval','running','succeeded','failed','blocked')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  trigger_type text not null,
  status text not null default 'queued' check (status in ('queued','running','waiting_approval','succeeded','failed','cancelled')),
  attempt integer not null default 1 check (attempt > 0),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('included','purchase','ai','voice','telephony','integration','automation','refund','adjustment')),
  amount_microunits bigint not null,
  monetary_amount_minor bigint,
  currency text not null default 'USD',
  reference_type text,
  reference_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.spending_limits (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  monthly_limit_minor bigint not null default 5000 check (monthly_limit_minor >= 0),
  voice_call_limit_seconds integer not null default 900 check (voice_call_limit_seconds > 0),
  alert_at_percent integer not null default 80 check (alert_at_percent between 1 and 100),
  hard_stop boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists activities_org_contact_time_idx on public.activities(organization_id, contact_id, occurred_at desc);
create index if not exists calls_org_time_idx on public.calls(organization_id, created_at desc);
create index if not exists tasks_org_status_due_idx on public.tasks(organization_id, status, due_at);
create index if not exists deals_org_stage_idx on public.deals(organization_id, pipeline, stage);
create index if not exists approvals_org_status_idx on public.approval_requests(organization_id, status, created_at desc);
create index if not exists tool_permissions_org_employee_idx on public.tool_permissions(organization_id, ai_employee_id);
create index if not exists tool_executions_org_time_idx on public.tool_executions(organization_id, created_at desc);
create index if not exists workflow_runs_org_time_idx on public.workflow_runs(organization_id, created_at desc);
create index if not exists credit_transactions_org_time_idx on public.credit_transactions(organization_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ai_employees','companies','contact_identifiers','deals','tasks','appointments',
    'activities','phone_numbers','calls','approval_requests','tool_permissions','tool_executions',
    'workflow_runs','credit_transactions','spending_limits'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "tenant_select" on public.%I', table_name);
    execute format('create policy "tenant_select" on public.%I for select using (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_insert" on public.%I', table_name);
    execute format('create policy "tenant_insert" on public.%I for insert with check (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_update" on public.%I', table_name);
    execute format('create policy "tenant_update" on public.%I for update using (organization_id in (select public.user_organization_ids())) with check (organization_id in (select public.user_organization_ids()))', table_name);
    execute format('drop policy if exists "tenant_delete" on public.%I', table_name);
    execute format('create policy "tenant_delete" on public.%I for delete using (organization_id in (select public.user_organization_ids()))', table_name);
  end loop;
end $$;

-- Sensitive resources require a manager even when a client talks directly to
-- Supabase instead of using the guarded Next.js route handler.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ai_employees','tool_permissions','phone_numbers','spending_limits',
    'inboxes','knowledge_articles','knowledge_sources','automations','integrations',
    'help_centers','voice_settings'
  ] loop
    execute format('drop policy if exists "tenant_insert" on public.%I', table_name);
    execute format('drop policy if exists "tenant_update" on public.%I', table_name);
    execute format('drop policy if exists "tenant_delete" on public.%I', table_name);
    execute format('drop policy if exists "manager_insert" on public.%I', table_name);
    execute format('drop policy if exists "manager_update" on public.%I', table_name);
    execute format('drop policy if exists "manager_delete" on public.%I', table_name);
    execute format('create policy "manager_insert" on public.%I for insert with check (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'')))', table_name, table_name);
    execute format('create policy "manager_update" on public.%I for update using (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin''))) with check (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'')))', table_name, table_name, table_name);
    execute format('create policy "manager_delete" on public.%I for delete using (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'')))', table_name, table_name);
  end loop;
end $$;

-- CRM writes are available to agents and managers, never read-only viewers.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'contacts','companies','contact_identifiers','conversations','messages',
    'deals','tasks','appointments','activities'
  ] loop
    execute format('drop policy if exists "tenant_insert" on public.%I', table_name);
    execute format('drop policy if exists "tenant_update" on public.%I', table_name);
    execute format('drop policy if exists "tenant_delete" on public.%I', table_name);
    execute format('drop policy if exists "operator_insert" on public.%I', table_name);
    execute format('drop policy if exists "operator_update" on public.%I', table_name);
    execute format('drop policy if exists "operator_delete" on public.%I', table_name);
    execute format('create policy "operator_insert" on public.%I for insert with check (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'',''agent'')))', table_name, table_name);
    execute format('create policy "operator_update" on public.%I for update using (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'',''agent''))) with check (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'',''agent'')))', table_name, table_name, table_name);
    execute format('create policy "operator_delete" on public.%I for delete using (exists (select 1 from public.memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'',''admin'')))', table_name, table_name);
  end loop;
end $$;

drop policy if exists "tenant_insert" on public.approval_requests;
drop policy if exists "tenant_update" on public.approval_requests;
drop policy if exists "tenant_delete" on public.approval_requests;
drop policy if exists "operator_request_approval" on public.approval_requests;
drop policy if exists "manager_decide_approval" on public.approval_requests;
drop policy if exists "manager_delete_approval" on public.approval_requests;
create policy "operator_request_approval" on public.approval_requests for insert
with check (exists (select 1 from public.memberships where memberships.organization_id = approval_requests.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin','agent')));
create policy "manager_decide_approval" on public.approval_requests for update
using (exists (select 1 from public.memberships where memberships.organization_id = approval_requests.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin')))
with check (exists (select 1 from public.memberships where memberships.organization_id = approval_requests.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin')));
create policy "manager_delete_approval" on public.approval_requests for delete
using (exists (select 1 from public.memberships where memberships.organization_id = approval_requests.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin')));

drop policy if exists "tenant_insert" on public.tool_executions;
drop policy if exists "tenant_update" on public.tool_executions;
drop policy if exists "tenant_delete" on public.tool_executions;
drop policy if exists "operator_insert_execution" on public.tool_executions;
drop policy if exists "operator_update_execution" on public.tool_executions;
drop policy if exists "manager_delete_execution" on public.tool_executions;
create policy "operator_insert_execution" on public.tool_executions for insert
with check (exists (select 1 from public.memberships where memberships.organization_id = tool_executions.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin','agent')));
create policy "operator_update_execution" on public.tool_executions for update
using (exists (select 1 from public.memberships where memberships.organization_id = tool_executions.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin','agent')))
with check (exists (select 1 from public.memberships where memberships.organization_id = tool_executions.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin','agent')));
create policy "manager_delete_execution" on public.tool_executions for delete
using (exists (select 1 from public.memberships where memberships.organization_id = tool_executions.organization_id and memberships.user_id = auth.uid() and memberships.role in ('owner','admin')));

-- Provider event and accounting rows are append-only through service-role code.
do $$
declare table_name text;
begin
  foreach table_name in array array['calls','workflow_runs','credit_transactions'] loop
    execute format('drop policy if exists "tenant_insert" on public.%I', table_name);
    execute format('drop policy if exists "tenant_update" on public.%I', table_name);
    execute format('drop policy if exists "tenant_delete" on public.%I', table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ai_employees','companies','deals','tasks','appointments','phone_numbers',
    'calls','approval_requests','tool_permissions','spending_limits'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

create or replace function public.credit_balance(p_organization_id uuid)
returns bigint
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(amount_microunits), 0)::bigint
  from public.credit_transactions
  where organization_id = p_organization_id
    and p_organization_id in (select public.user_organization_ids());
$$;

revoke all on function public.credit_balance(uuid) from public, anon;
grant execute on function public.credit_balance(uuid) to authenticated, service_role;
