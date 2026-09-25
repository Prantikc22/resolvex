-- Launch CRM: tenant-scoped sales pipeline, sequences, lifecycle and scoring.

alter table public.contacts
  add column if not exists lifecycle_stage text not null default 'lead',
  add column if not exists lead_score integer not null default 0,
  add column if not exists territory text,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table public.deals
  add column if not exists probability integer not null default 10,
  add column if not exists next_step text,
  add column if not exists territory text,
  add column if not exists insights jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contacts_lifecycle_stage_check'
  ) then
    alter table public.contacts add constraint contacts_lifecycle_stage_check
      check (lifecycle_stage in ('subscriber','lead','marketing_qualified','sales_qualified','opportunity','customer','evangelist','other'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'contacts_lead_score_check'
  ) then
    alter table public.contacts add constraint contacts_lead_score_check
      check (lead_score between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'deals_probability_check'
  ) then
    alter table public.deals add constraint deals_probability_check
      check (probability between 0 and 100);
  end if;
end $$;

create table if not exists public.sales_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  audience_stage text not null default 'lead',
  template_subject text not null default '',
  template_body text not null default '',
  steps jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sequence_id uuid not null references public.sales_sequences(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','completed','replied','cancelled')),
  current_step integer not null default 0,
  next_step_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sequence_id, contact_id)
);

create index if not exists contacts_org_lifecycle_score_idx
  on public.contacts(organization_id, lifecycle_stage, lead_score desc);
create index if not exists deals_org_pipeline_stage_idx
  on public.deals(organization_id, pipeline, stage, updated_at desc);
create index if not exists sequences_org_status_idx
  on public.sales_sequences(organization_id, status, updated_at desc);
create index if not exists sequence_enrollments_org_next_idx
  on public.sequence_enrollments(organization_id, status, next_step_at);

alter table public.sales_sequences enable row level security;
alter table public.sequence_enrollments enable row level security;

drop policy if exists "tenant_select" on public.sales_sequences;
create policy "tenant_select" on public.sales_sequences for select
using (organization_id in (select public.user_organization_ids()));
drop policy if exists "operator_insert" on public.sales_sequences;
create policy "operator_insert" on public.sales_sequences for insert
with check (exists (
  select 1 from public.memberships
  where memberships.organization_id = sales_sequences.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
));
drop policy if exists "operator_update" on public.sales_sequences;
create policy "operator_update" on public.sales_sequences for update
using (exists (
  select 1 from public.memberships
  where memberships.organization_id = sales_sequences.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
)) with check (exists (
  select 1 from public.memberships
  where memberships.organization_id = sales_sequences.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
));
drop policy if exists "manager_delete" on public.sales_sequences;
create policy "manager_delete" on public.sales_sequences for delete
using (exists (
  select 1 from public.memberships
  where memberships.organization_id = sales_sequences.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin')
));

drop policy if exists "tenant_select" on public.sequence_enrollments;
create policy "tenant_select" on public.sequence_enrollments for select
using (organization_id in (select public.user_organization_ids()));
drop policy if exists "operator_insert" on public.sequence_enrollments;
create policy "operator_insert" on public.sequence_enrollments for insert
with check (exists (
  select 1 from public.memberships
  where memberships.organization_id = sequence_enrollments.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
));
drop policy if exists "operator_update" on public.sequence_enrollments;
create policy "operator_update" on public.sequence_enrollments for update
using (exists (
  select 1 from public.memberships
  where memberships.organization_id = sequence_enrollments.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
)) with check (exists (
  select 1 from public.memberships
  where memberships.organization_id = sequence_enrollments.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin','agent')
));
drop policy if exists "manager_delete" on public.sequence_enrollments;
create policy "manager_delete" on public.sequence_enrollments for delete
using (exists (
  select 1 from public.memberships
  where memberships.organization_id = sequence_enrollments.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('owner','admin')
));

drop trigger if exists set_sales_sequences_updated_at on public.sales_sequences;
create trigger set_sales_sequences_updated_at before update on public.sales_sequences
for each row execute procedure public.set_updated_at();
drop trigger if exists set_sequence_enrollments_updated_at on public.sequence_enrollments;
create trigger set_sequence_enrollments_updated_at before update on public.sequence_enrollments
for each row execute procedure public.set_updated_at();
