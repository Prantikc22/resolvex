create unique index if not exists usage_events_ai_resolution_conversation_idx
on public.usage_events (
  organization_id,
  (metadata ->> 'conversation_id')
)
where event_type = 'ai_resolution';

create index if not exists usage_events_org_type_time_idx
on public.usage_events (organization_id, event_type, created_at desc);
