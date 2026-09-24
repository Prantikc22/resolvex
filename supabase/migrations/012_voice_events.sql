-- Idempotent provider-event storage for voice ingestion and billing reconciliation.
create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

alter table public.provider_events enable row level security;
-- No client policies by design: webhook handlers use the service-role client.

alter table public.phone_numbers
  add column if not exists elevenlabs_phone_number_id text,
  add column if not exists sip_trunk_id text;

create index if not exists provider_events_created_idx
  on public.provider_events(provider, created_at desc);
