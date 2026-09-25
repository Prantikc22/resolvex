alter table public.telephony_compliance_requests
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists gst_number text,
  add column if not exists cin_document_path text,
  add column if not exists gst_document_path text,
  add column if not exists provider_submission_status text not null default 'queued'
    check (provider_submission_status in ('queued','submitted','action_required','approved','rejected'));

alter table public.telephony_compliance_requests
  drop constraint if exists telephony_compliance_requests_status_check;
alter table public.telephony_compliance_requests
  add constraint telephony_compliance_requests_status_check
  check (status in ('draft','submitted','in_review','needs_information','approved','rejected'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'telephony-compliance',
  'telephony-compliance',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- There are deliberately no customer-facing storage policies. Compliance
-- documents are read and written only by tenant-checked server routes using
-- the service role, so one tenant can never enumerate another tenant's files.
