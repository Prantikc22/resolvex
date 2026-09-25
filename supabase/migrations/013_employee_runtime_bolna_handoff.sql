-- Durable ResolveX employee runtime, multi-provider voice, and human handoff.
-- This migration is additive and keeps every existing tenant row intact.

create table if not exists public.ai_provider_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  provider text not null check (provider in ('elevenlabs','bolna')),
  channel text not null check (channel in ('website_voice','telephone')),
  external_agent_id text not null,
  status text not null default 'active' check (status in ('provisioning','active','paused','failed','deleted')),
  config jsonb not null default '{}'::jsonb,
  last_error text,
  provisioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ai_employee_id, provider, channel),
  unique (provider, external_agent_id)
);

create table if not exists public.employee_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  automation_id uuid references public.automations(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  job_type text not null check (job_type in ('flow','employee_task','scheduled_follow_up','provider_reconciliation')),
  trigger_type text not null,
  status text not null default 'queued' check (status in ('queued','running','waiting_approval','retrying','succeeded','failed','cancelled')),
  idempotency_key text not null,
  input jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  run_at timestamptz not null default now(),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  timeout_seconds integer not null default 90 check (timeout_seconds between 5 and 900),
  max_tool_calls integer not null default 5 check (max_tool_calls between 0 and 50),
  tool_calls_used integer not null default 0 check (tool_calls_used >= 0),
  max_spend_minor bigint not null default 100 check (max_spend_minor >= 0),
  spend_minor bigint not null default 0 check (spend_minor >= 0),
  approval_id uuid references public.approval_requests(id) on delete set null,
  cancel_requested_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.human_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  ai_employee_id uuid references public.ai_employees(id) on delete set null,
  source text not null check (source in ('website_chat','website_voice','telephone','email','automation')),
  status text not null default 'waiting' check (status in ('waiting','assigned','accepted','resolved','cancelled')),
  reason text not null,
  summary text,
  requested_contact jsonb not null default '{}'::jsonb,
  assigned_to uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists human_handoffs_one_active_per_conversation_idx
  on public.human_handoffs(conversation_id)
  where status in ('waiting','assigned','accepted');

create table if not exists public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  handoff_id uuid references public.human_handoffs(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  phone_number text,
  preferred_at timestamptz,
  status text not null default 'requested' check (status in ('requested','scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automations
  add column if not exists description text not null default '',
  add column if not exists schedule_config jsonb not null default '{}'::jsonb,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists failure_count integer not null default 0;

alter table public.workflow_runs
  add column if not exists idempotency_key text;

create unique index if not exists workflow_runs_org_idempotency_idx
  on public.workflow_runs(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists ai_provider_agents_employee_idx
  on public.ai_provider_agents(organization_id, ai_employee_id, provider);
create index if not exists employee_jobs_due_idx
  on public.employee_jobs(status, run_at, created_at)
  where status in ('queued','retrying');
create index if not exists employee_jobs_org_idx
  on public.employee_jobs(organization_id, created_at desc);
create index if not exists handoffs_org_status_idx
  on public.human_handoffs(organization_id, status, created_at desc);

alter table public.ai_provider_agents enable row level security;
alter table public.employee_jobs enable row level security;
alter table public.human_handoffs enable row level security;
alter table public.callback_requests enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['ai_provider_agents','employee_jobs','human_handoffs','callback_requests'] loop
    execute format('drop policy if exists "tenant_select" on public.%I', table_name);
    execute format('create policy "tenant_select" on public.%I for select using (organization_id in (select public.user_organization_ids()))', table_name);
  end loop;
end $$;

-- Provider resources and jobs are written only by server-side service-role code.
-- Human handoffs can be accepted and resolved by workspace operators.
drop policy if exists "operator_update_handoff" on public.human_handoffs;
create policy "operator_update_handoff" on public.human_handoffs for update
using (exists (
  select 1 from public.memberships
  where memberships.organization_id = human_handoffs.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
))
with check (exists (
  select 1 from public.memberships
  where memberships.organization_id = human_handoffs.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
));

do $$
declare table_name text;
begin
  foreach table_name in array array['ai_provider_agents','employee_jobs','human_handoffs','callback_requests'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

-- Atomically leases due work. Service-role bypasses RLS; clients cannot execute it.
create or replace function public.claim_employee_jobs(p_worker text, p_limit integer default 10)
returns setof public.employee_jobs
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select id
    from public.employee_jobs
    where status in ('queued','retrying')
      and run_at <= now()
      and cancel_requested_at is null
      and (locked_at is null or locked_at < now() - interval '10 minutes')
    order by run_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.employee_jobs jobs
    set status = 'running',
        locked_at = now(),
        locked_by = p_worker,
        started_at = coalesce(jobs.started_at, now()),
        attempt = jobs.attempt + 1,
        error = null
  from due
  where jobs.id = due.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_employee_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_employee_jobs(text, integer) to service_role;

-- Supabase Cron wakes the short-lived worker; jobs themselves remain in the
-- tenant-scoped durable table above. The worker never waits inside a request.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.configure_employee_worker(
  p_worker_url text,
  p_worker_secret text
)
returns void
language plpgsql security definer
set search_path = public, vault, cron, net
as $$
declare
  worker_url_secret_id uuid;
  worker_auth_secret_id uuid;
  existing_job record;
begin
  if p_worker_url !~ '^https://[^/]+/api/jobs/process$' then
    raise exception 'Worker URL must be an HTTPS /api/jobs/process endpoint.';
  end if;
  if length(p_worker_secret) < 24 then
    raise exception 'Worker secret must contain at least 24 characters.';
  end if;

  select id into worker_url_secret_id from vault.secrets
    where name = 'resolvex_worker_url' limit 1;
  if worker_url_secret_id is null then
    perform vault.create_secret(p_worker_url, 'resolvex_worker_url', 'ResolveX employee worker URL');
  else
    perform vault.update_secret(worker_url_secret_id, p_worker_url);
  end if;

  select id into worker_auth_secret_id from vault.secrets
    where name = 'resolvex_worker_secret' limit 1;
  if worker_auth_secret_id is null then
    perform vault.create_secret(p_worker_secret, 'resolvex_worker_secret', 'ResolveX employee worker bearer secret');
  else
    perform vault.update_secret(worker_auth_secret_id, p_worker_secret);
  end if;

  for existing_job in select jobid from cron.job where jobname = 'resolvex-employee-worker'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'resolvex-employee-worker',
    '* * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'resolvex_worker_url' limit 1),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'resolvex_worker_secret' limit 1)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
      );
    $cron$
  );
end;
$$;

revoke all on function public.configure_employee_worker(text, text) from public, anon, authenticated;
grant execute on function public.configure_employee_worker(text, text) to service_role;
