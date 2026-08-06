create unique index if not exists usage_events_ai_allowance_conversation_period_idx
on public.usage_events (
  organization_id,
  (metadata ->> 'conversation_id'),
  (metadata ->> 'period_key')
)
where event_type = 'ai_allowance';

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

  if used_count >= p_limit then
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
      'period_key', p_period_key
    )
  );

  return true;
end;
$$;

revoke all on function public.reserve_ai_allowance(uuid, uuid, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_allowance(uuid, uuid, timestamptz, text, integer) to service_role;
