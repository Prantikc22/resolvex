create table if not exists public.telephony_compliance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  country text not null default 'IN' check (country = 'IN'),
  status text not null default 'submitted' check (status in ('submitted','in_review','needs_information','approved','rejected')),
  legal_business_name text not null,
  registration_number text not null,
  registered_address text not null,
  website text,
  calling_use_case text not null,
  estimated_monthly_minutes integer not null default 0 check (estimated_monthly_minutes >= 0),
  authorized_contact_name text not null,
  authorized_contact_email text not null,
  consent_confirmed boolean not null default false,
  external_application_id uuid,
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country)
);

alter table public.telephony_compliance_requests enable row level security;

-- Compliance records contain provider-only identifiers. They are intentionally
-- service-role-only; customer access is mediated by the tenant-checked API,
-- which never returns external_application_id.
drop policy if exists "service_role_only" on public.telephony_compliance_requests;

drop trigger if exists telephony_compliance_requests_set_updated_at
  on public.telephony_compliance_requests;
create trigger telephony_compliance_requests_set_updated_at
before update on public.telephony_compliance_requests
for each row execute function public.set_updated_at();

create index if not exists telephony_compliance_requests_status_idx
  on public.telephony_compliance_requests (status, updated_at desc);
