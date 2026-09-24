# ResolveX 2.0 local testing

## 1. Configure local secrets

Copy `.env.example` to `.env.local` and populate the server-only provider values. Never prefix provider master keys with `NEXT_PUBLIC_`.

Required for the full local surface:

- Supabase URL, anon key, service-role key, and direct database URL
- OpenRouter key
- Composio key
- ElevenLabs key
- Plivo Auth ID and Auth Token
- Existing Paddle or Razorpay sandbox values

## 2. Apply the additive schema

```bash
npm run db:migrate
```

Migration `011_resolvex_2_core.sql` adds tenant-scoped AI employees, CRM/timeline records, calls, phone states, approvals, tool executions, workflow runs, and credit/spend controls. It does not replace existing tables or subscription records.

## 3. Start locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Safe test order

1. Sign in and open an existing workspace.
2. Verify Overview, Inbox, Contacts, Knowledge, Team, and Billing still load.
3. Create a chat-only AI employee and activate it. No external resource is created.
4. Connect a low-risk Composio sandbox/test account and verify the badge changes only after authorization succeeds.
5. Create a voice employee, select a voice, activate it, and test through the browser microphone.
6. Search Plivo inventory. Do not expect the local app to purchase a number; activation requests remain pending billing/compliance approval.
7. Create a rule, send a widget message, and verify a workflow run is recorded.
8. Create a contact, task, and deal; confirm tenant-scoped retrieval.
9. Trigger a consequential tool request and approve/reject it from Approvals.
10. Set a small spend limit and confirm new billable sessions stop at the limit.

## 5. Verification commands

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm audit
```

Provider actions must be recorded as untested until their real sandbox/account journey succeeds. Do not use production phone numbers, live payment credentials, or customer data during local validation.
