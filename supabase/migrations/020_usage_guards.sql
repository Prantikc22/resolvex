-- Fixed-window counters that bound every path which spends provider money
-- (AI replies, decision calls, employee actions). One atomic call both checks
-- and consumes, so concurrent serverless requests cannot overshoot.
create table if not exists public.usage_guard_counters (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create index if not exists usage_guard_counters_window_idx
on public.usage_guard_counters (window_start);

alter table public.usage_guard_counters enable row level security;

create or replace function public.consume_usage_guard(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  used integer;
begin
  insert into public.usage_guard_counters (key, window_start, count)
  values (p_key, bucket, 1)
  on conflict (key, window_start)
  do update set count = public.usage_guard_counters.count + 1
  returning count into used;

  -- Opportunistic cleanup keeps the table small without a separate job.
  if random() < 0.01 then
    delete from public.usage_guard_counters
    where window_start < now() - interval '40 days';
  end if;

  return used <= p_limit;
end;
$$;

revoke all on function public.consume_usage_guard(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_usage_guard(text, integer, integer) to service_role;

-- Every call that consumed provider minutes is billable, not only "completed".
drop index if exists public.calls_unreported_minutes_idx;
create index if not exists calls_unreported_minutes_idx
on public.calls (organization_id, created_at)
where duration_seconds > 0 and billing_reported_at is null;

-- Only a paid, active subscription unlocks AI conversations beyond the
-- included allowance. Trials stay within the 50 included conversations.
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
      and provider = 'dodo'
      and status = 'active'
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
