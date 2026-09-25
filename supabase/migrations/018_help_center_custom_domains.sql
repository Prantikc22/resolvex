-- Customer-owned help-center domains.
-- ResolveX stores the domain mapping and verification state; the customer
-- remains responsible for owning the domain and managing its DNS records.

alter table public.help_centers
  add column if not exists custom_domain_status text not null default 'unconfigured'
    check (custom_domain_status in ('unconfigured', 'pending', 'verified', 'error'));

alter table public.help_centers
  add column if not exists custom_domain_target text;

alter table public.help_centers
  add column if not exists custom_domain_verification jsonb not null default '{}'::jsonb;

alter table public.help_centers
  add column if not exists custom_domain_verified_at timestamptz;

update public.help_centers
set custom_domain_status = case
  when custom_domain is null or btrim(custom_domain) = '' then 'unconfigured'
  else 'pending'
end
where custom_domain_status = 'unconfigured';

create unique index if not exists help_centers_custom_domain_unique
  on public.help_centers (lower(custom_domain))
  where custom_domain is not null;

comment on column public.help_centers.custom_domain is
  'Customer-owned hostname serving this published help center.';
comment on column public.help_centers.custom_domain_status is
  'DNS/Vercel lifecycle state for the customer-owned hostname.';
