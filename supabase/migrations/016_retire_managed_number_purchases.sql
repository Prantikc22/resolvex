-- ResolveX no longer sells or purchases phone numbers. Customers own their
-- carrier relationship and connect an existing number through SIP.

update public.approval_requests
set
  status = 'rejected',
  result = jsonb_build_object(
    'reason',
    'ResolveX no longer purchases phone numbers. Connect a customer-owned number instead.'
  ),
  decided_at = now(),
  updated_at = now()
where status = 'pending'
  and action_type in (
    'phone_number_purchase',
    'managed_phone_purchase',
    'bolna_phone_purchase'
  );

update public.phone_numbers as phone
set
  status = 'released',
  monthly_cost_minor = null,
  currency = null,
  updated_at = now()
where phone.status in ('pending_authorization', 'pending_compliance')
  and exists (
    select 1
    from public.approval_requests as approval
    where approval.organization_id = phone.organization_id
      and approval.payload ->> 'phone_number_id' = phone.id::text
      and approval.action_type in (
        'phone_number_purchase',
        'managed_phone_purchase',
        'bolna_phone_purchase'
      )
  );
