drop policy if exists "tenant_insert" on public.subscriptions;
drop policy if exists "tenant_update" on public.subscriptions;
drop policy if exists "tenant_delete" on public.subscriptions;

create policy "billing_manager_insert"
on public.subscriptions
for insert
with check (
  exists (
    select 1
    from public.memberships
    where memberships.organization_id = subscriptions.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

create policy "billing_manager_update"
on public.subscriptions
for update
using (
  exists (
    select 1
    from public.memberships
    where memberships.organization_id = subscriptions.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.memberships
    where memberships.organization_id = subscriptions.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

create policy "billing_manager_delete"
on public.subscriptions
for delete
using (
  exists (
    select 1
    from public.memberships
    where memberships.organization_id = subscriptions.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);
