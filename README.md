# ResolveX

ResolveX is a standalone customer-support platform that combines a shared inbox, AI resolution, workflows, knowledge, reporting, and customer context in one workspace.

## Product surfaces

- `/` - animated marketing site and pricing
- `/demo` - public interactive workspace with demo data
- `/signup` and `/login` - Supabase-backed authentication
- `/onboarding` - workspace, inbox, and AI-policy setup
- `/app` - authenticated support workspace
- `/api/billing/*` - Dodo Payments checkout, usage metering, customer portal, and webhook endpoints, with Razorpay compatibility during migration

## Local setup

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000` unless that port is occupied.

## Environment variables

Populate `.env.local` with:

```text
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_WEBHOOK_SECRET=
```

Never expose the Supabase service-role key, Dodo Payments API key, webhook key, or Razorpay secret to browser code. The `NEXT_PUBLIC_*` values are the only client-readable variables.

## Database

The initial schema lives in `supabase/migrations/001_initial.sql`. It includes organisations, memberships, contacts, inboxes, conversations, messages, knowledge, automations, integrations, subscriptions, usage events, indexes, triggers, and row-level security policies.

Run migrations with:

```bash
npm run db:migrate
```

## Razorpay

Add the Razorpay keys to `.env.local`, configure the webhook URL as `/api/billing/webhook`, and set the same webhook secret in Razorpay and `RAZORPAY_WEBHOOK_SECRET`. Checkout can call `/api/billing/create-order`, then submit the returned payment details to `/api/billing/verify`.

## Dodo Payments

Billing defaults to Dodo Payments (set `BILLING_PROVIDER=razorpay` only for the
legacy flow). Add `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_ENVIRONMENT`
(`test_mode` or `live_mode`), then run `npm run dodo:setup`. It idempotently
creates the AI-resolution and voice-minute meters and the "ResolveX One"
product ($15/seat/month, 50 included resolutions, $0.39 per extra resolution,
$0.20 per voice minute) and prints `DODO_PAYMENTS_PRODUCT_ID`.

Register a webhook in Dodo pointing at `/api/billing/dodo/webhook` and put its
signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`. Customers are also synced when
they return from checkout, so test-mode checkouts work before the webhook is
registered. The minute worker (`/api/jobs/process`) reports completed AI
resolutions and voice minutes to the meters with idempotent event IDs.

## Welcome email

Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, and `RESEND_NOTIFY_EMAIL` in the deployment secret store. Completing onboarding sends the new user a welcome email and notifies the internal address once. Verify the sending domain in Resend before public onboarding; `onboarding@resend.dev` is suitable only for restricted testing.

## Verification

```bash
npm run lint
npm run build
```
