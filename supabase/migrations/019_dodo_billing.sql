-- Dodo Payments replaces Paddle. Usage is metered natively by Dodo, so each
-- billable row only needs a marker recording when it was reported.
alter table public.usage_events
  add column if not exists billing_reported_at timestamptz;

create index if not exists usage_events_unreported_resolutions_idx
on public.usage_events (organization_id, created_at)
where event_type = 'ai_resolution' and billing_reported_at is null;

alter table public.calls
  add column if not exists billing_reported_at timestamptz;

create index if not exists calls_unreported_minutes_idx
on public.calls (organization_id, created_at)
where status = 'completed' and billing_reported_at is null;

-- Paid workspaces keep answering after the included allowance; the overage is
-- billed through the Dodo usage meter instead of forcing a human handoff.
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
      and provider in ('dodo', 'paddle')
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
