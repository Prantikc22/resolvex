drop policy if exists "organizations_member_access" on public.organizations;

create policy "organizations_member_access"
on public.organizations
for select
using (
  owner_id = auth.uid()
  or id in (select public.user_organization_ids())
);
