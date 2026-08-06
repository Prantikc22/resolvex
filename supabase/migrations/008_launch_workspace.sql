alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_status_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_status_check
  check (status in ('processing','draft','ready','failed','paused'));

alter table public.knowledge_articles
  add column if not exists source_id uuid references public.knowledge_sources(id) on delete cascade;

create index if not exists knowledge_articles_source_idx
  on public.knowledge_articles(source_id);

alter table public.organizations
  alter column trial_ends_at set default (now() + interval '7 days');

create index if not exists invitations_org_status_idx
  on public.invitations(organization_id, accepted_at, expires_at);

create index if not exists automations_org_enabled_idx
  on public.automations(organization_id, enabled);

create index if not exists integrations_org_status_idx
  on public.integrations(organization_id, status);
