-- Prepaid voice minutes. Purchases add minutes, finished calls subtract them.
-- The unique reference makes webhook retries and worker reruns idempotent.
create table if not exists public.voice_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  minutes integer not null check (minutes <> 0),
  kind text not null check (kind in ('purchase', 'usage', 'adjustment')),
  reference text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, kind, reference)
);

create index if not exists voice_credit_ledger_org_idx
on public.voice_credit_ledger (organization_id, created_at desc);

alter table public.voice_credit_ledger enable row level security;

drop policy if exists "voice_credits_tenant_read" on public.voice_credit_ledger;
create policy "voice_credits_tenant_read"
on public.voice_credit_ledger for select
using (organization_id in (select public.user_organization_ids()));

create or replace function public.voice_minutes_balance(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(minutes), 0)::integer
  from public.voice_credit_ledger
  where organization_id = p_organization_id;
$$;

revoke all on function public.voice_minutes_balance(uuid) from public, anon, authenticated;
grant execute on function public.voice_minutes_balance(uuid) to service_role;
