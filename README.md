# ResolveX

ResolveX is a standalone customer-support platform that combines a shared inbox, AI resolution, workflows, knowledge, reporting, and customer context in one workspace.

## Product surfaces

- `/` - animated marketing site and pricing
- `/demo` - public interactive workspace with demo data
- `/signup` and `/login` - Supabase-backed authentication
- `/onboarding` - workspace, inbox, and AI-policy setup
- `/app` - authenticated support workspace
- `/api/billing/*` - Paddle checkout, usage billing, portal, and webhook endpoints, with Razorpay compatibility during migration

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

Never expose the Supabase service-role key, Paddle API key, webhook secret, or Razorpay secret to browser code. The `NEXT_PUBLIC_*` values are the only client-readable variables.

## Database

The initial schema lives in `supabase/migrations/001_initial.sql`. It includes organisations, memberships, contacts, inboxes, conversations, messages, knowledge, automations, integrations, subscriptions, usage events, indexes, triggers, and row-level security policies.

Run migrations with:

```bash
npm run db:migrate
```

## Razorpay

Add the Razorpay keys to `.env.local`, configure the webhook URL as `/api/billing/webhook`, and set the same webhook secret in Razorpay and `RAZORPAY_WEBHOOK_SECRET`. Checkout can call `/api/billing/create-order`, then submit the returned payment details to `/api/billing/verify`.

## Paddle

Set `BILLING_PROVIDER=paddle`, add the Paddle API key, browser client token,
seat price, overage price, and notification secret shown in `.env.example`.
Configure signed notifications at `/api/billing/paddle/webhook`. The hourly
usage job submits one idempotent charge per subscription period for completed
AI resolutions above the 50 included allowance.

## Welcome email

Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, and `RESEND_NOTIFY_EMAIL` in the deployment secret store. Completing onboarding sends the new user a welcome email and notifies the internal address once. Verify the sending domain in Resend before public onboarding; `onboarding@resend.dev` is suitable only for restricted testing.

## Verification

```bash
npm run lint
npm run build
```
