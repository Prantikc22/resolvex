create table if not exists public.billing_webhook_events (
  event_id text primary key,
  provider text not null,
  event_type text not null,
  occurred_at timestamptz,
  processed_at timestamptz not null default now()
);

create table if not exists public.usage_billing_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_subscription_id text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'submitted', 'failed')),
  provider_reference text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_subscription_id, period_start)
);

create index if not exists usage_billing_batches_subscription_period_idx
on public.usage_billing_batches (provider_subscription_id, period_start, status);

alter table public.billing_webhook_events enable row level security;
alter table public.usage_billing_batches enable row level security;

drop policy if exists "billing_events_service_only" on public.billing_webhook_events;
drop policy if exists "usage_batches_tenant_read" on public.usage_billing_batches;
create policy "usage_batches_tenant_read"
on public.usage_billing_batches for select
using (organization_id in (select public.user_organization_ids()));

create or replace function public.reserve_ai_allowance(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_period_start timestamptz,
  p_period_key text,
  p_limit integer default 50
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used_count integer;
  usage_billing_active boolean;
begin
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  if exists (
    select 1 from public.usage_events
    where organization_id = p_organization_id
      and event_type = 'ai_allowance'
      and metadata ->> 'conversation_id' = p_conversation_id::text
      and metadata ->> 'period_key' = p_period_key
  ) then
    return true;
  end if;

  select coalesce(sum(quantity), 0)::integer into used_count
  from public.usage_events
  where organization_id = p_organization_id
    and event_type = 'ai_allowance'
    and created_at >= p_period_start;

  select exists (
    select 1 from public.subscriptions
    where organization_id = p_organization_id
      and provider = 'paddle'
      and status in ('active', 'trialing')
  ) into usage_billing_active;

  if used_count >= p_limit and not usage_billing_active then
    return false;
  end if;

  insert into public.usage_events (
    organization_id, event_type, quantity, metadata
  ) values (
    p_organization_id,
    'ai_allowance',
    1,
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'period_key', p_period_key,
      'billable', used_count >= p_limit
    )
  );

  return true;
end;
$$;

revoke all on function public.reserve_ai_allowance(uuid, uuid, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_allowance(uuid, uuid, timestamptz, text, integer) to service_role;
