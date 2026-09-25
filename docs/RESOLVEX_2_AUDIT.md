# ResolveX 2.0 repository audit

Updated: 24 September 2026

## Executive decision

ResolveX should remain a single Next.js application on Vercel with Supabase for authentication and tenant data. The existing inbox, messenger, knowledge, Arlo, billing, and team-management code is real and worth preserving.

ResolveX will extend its native communication and automation systems rather than adopting Chatwoot or Activepieces as runtime dependencies now. This avoids a second authentication system, duplicate customer and conversation storage, separate worker/Redis/PostgreSQL operations, and enterprise-embedding licensing risk. The decision can be revisited when a measured channel or workflow requirement exceeds the native architecture.

## Existing architecture

| Area            | Current implementation                                                                                                                          | Assessment                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Next.js 16 App Router, React 19, Tailwind CSS 4, Framer Motion, Recharts                                                                        | Retain. The application already uses server/client boundaries and route handlers correctly.                                                         |
| Backend         | Next.js route handlers deployed with the web app                                                                                                | Retain for request/response work. Durable async work still needs a queue before high-volume production.                                             |
| Database        | Supabase Postgres with ordered SQL migrations                                                                                                   | Retain. Additive migrations are sufficient.                                                                                                         |
| Authentication  | Supabase Auth with SSR cookies, email/password and OAuth callback                                                                               | Retain. No reason to migrate providers.                                                                                                             |
| Tenancy         | `organizations`, `memberships`, `organization_id` foreign keys, RLS policies, server-side current-workspace resolution                          | Retain and extend to every new table. Do not accept an organization ID from models or browsers as authority.                                        |
| Inbox           | Native inboxes, contacts, conversations, messages, priorities, assignment, AI state, internal-message flag, human reply and resolve APIs        | Retain. It already supports the required three-panel model in live and demo surfaces.                                                               |
| Website chat    | Installable script, public workspace key, config route, persisted sessions, per-conversation burst limit                                        | Retain. Harden with broader abuse controls before public scale.                                                                                     |
| Email           | Inbox schema and Resend transactional mail; no complete inbound-email ingestion pipeline                                                        | Improve. Connect a verified inbound provider before advertising email as active.                                                                    |
| Knowledge       | Website crawl, sitemap discovery, SSRF protection, PDF extraction, review/approval states, help center                                          | Retain. Add chunked retrieval/vector search and durable ingestion jobs before large knowledge bases.                                                |
| Arlo            | Server-only OpenRouter client, approved-context boundary, prompt-injection instruction, conversation history, AI allowance reservation, handoff | Retain as the shared text engine. Improve model configuration, token/cost capture, retrieval, tools, and role-specific context.                     |
| Voice           | Only legacy settings/call-dialog surfaces existed before ResolveX 2.0                                                                           | Missing before this work. The new adapter uses ElevenLabs Agents and private signed sessions.                                                       |
| Telephony       | No live carrier adapter before ResolveX 2.0                                                                                                     | Missing before this work. Plivo search is now isolated behind a provider adapter; purchasing remains behind billing/compliance approval.            |
| Billing         | Dodo Payments and Razorpay subscription routes, signature verification, team-seat synchronization, AI-resolution overage batches                       | Retain. Preserve existing subscriptions and pricing. Add the new immutable usage/credit ledger and hard spend controls.                             |
| User management | Invitations, role changes, seat checks, email delivery, owner protection                                                                        | Retain.                                                                                                                                             |
| CRM             | Contacts existed, but companies, deals, activities, appointments, tasks, identifiers, and timeline did not                                      | Extend natively. A full external CRM is unnecessary; Composio should connect HubSpot or another supported CRM for customers who already use one.    |
| Automation      | Message rules for priority, tags, and handoff                                                                                                   | Extend natively. Durable run records are now added; scheduled triggers, retries, and approval waits require a worker/queue before production scale. |
| Analytics       | Live 30-day conversation, resolution, reply, and first-response calculations                                                                    | Retain. Extend with real calls, appointments, leads, escalations, CSAT, and cost data only after those events exist.                                |
| Integrations    | Signed outbound-style webhooks with SSRF checks                                                                                                 | Retain. Composio managed authentication and session-scoped tools are now the primary business-app connection path.                                  |
| Deployment      | Vercel-oriented Next.js app; no separate runtime service                                                                                        | Retain Vercel. Do not deploy Chatwoot, Activepieces, or a carrier service unless a later measured requirement justifies it.                         |

## What is already working and should be retained

- Signup, login, OAuth callback, password recovery, onboarding, workspace creation, and protected workspace routing.
- Organization membership and RLS-backed tenant isolation for existing data.
- Website messenger installation, configuration, public key rotation, inbound message persistence, and real live inbox display.
- Human reply and resolve actions, including stopping AI replies after a human takes over.
- Approved website/PDF knowledge ingestion and grounded Arlo replies through OpenRouter.
- AI resolution metering reported to Dodo Payments; voice runs on prepaid minute packs.
- Team invitations, roles, paid-seat checks, and provider seat synchronization.
- Webhook integrations with URL and private-network validation.
- Public marketing, demo, pricing, resources, help, comparison, legal, and status surfaces.

## Functionality requiring improvement

- `getCurrentOrganization()` selects the first membership. Add explicit workspace switching before supporting users in multiple workspaces.
- The original broad RLS write policies let any member role mutate most tenant rows. Migration `011_resolvex_2_core.sql` now separates viewer, operator, and manager writes for the inbox, AI workforce, knowledge, integrations, CRM, phone, approval, and spending-control tables. Continue adding explicit policies alongside every future table or mutation.
- Website ingestion is synchronous and stores large source bodies. Move crawling, PDF processing, embeddings, and re-sync to durable jobs with per-source progress.
- Arlo currently concatenates approved content. Replace this with tenant-scoped chunk retrieval and citations before large-scale use.
- Rate limiting is conversation-local. Add an edge or durable workspace/IP limiter for public chat, voice session issuance, auth, and provider operations.
- Webhook deliveries need signatures, retries, delivery logs, and replay controls.
- Automation run creation is now durable, but retry scheduling and background recovery still need a worker.
- Existing pricing is a single active commercial structure. The proposed Free/Starter/Growth/Business/Enterprise catalog must not replace contracted pricing without an owner-approved migration plan and provider price IDs.

## Missing before ResolveX 2.0 work

- Configurable AI employee records and lifecycle.
- Real ElevenLabs provisioning and private browser voice sessions.
- Provider-independent phone number and call data model.
- Plivo inventory search and compliance-aware activation states.
- Composio managed OAuth, connected-account status, and a tenant-scoped tool gateway.
- Execution-layer tool permissions, approvals, idempotency, and audit history.
- Native companies, deals, activities, appointments, tasks, multiple customer identifiers, and customer timelines.
- Durable workflow-run records.
- Exact credit ledger, spending limits, usage alerts, and per-call duration controls.

## Open-source evaluation

### Chatwoot

Chatwoot Community Edition provides a capable shared inbox, contacts, web chat, social channels, API, and webhooks under MIT terms. Its enterprise directory is separately licensed, and features such as custom branding, richer roles/permissions, SLA policies, voice, and some AI capabilities are not Community Edition assumptions.

ResolveX already has its own Supabase authentication, tenant model, inbox, contacts, messenger, messages, handoff, knowledge, billing, and branded UI. Adopting Chatwoot as a backend would require workspace/account mapping, dual data synchronization, a migration strategy, Redis, workers, another Postgres workload, and continuous operations. It does not reduce enough work at the present scale.

Decision: **Approach A — preserve and extend ResolveX communication infrastructure.** Reassess only for a specific approved channel whose native implementation cost is demonstrably higher than operating Chatwoot.

### Activepieces

Activepieces is strong for triggers, schedules, connector actions, retries, background work, and run history. Its hosted/embedded builder capabilities are commercial offerings; a customer-facing embedded experience must not be assumed to be part of the open-source core.

ResolveX already has a small native rule engine, and Composio supplies the initial managed application-action layer. Adding Activepieces today would create an always-on service, another permissions surface, and duplicated workflow state before the product has complex workflow volume.

Decision: **Approach A — extend the native flow engine now.** If advanced branching, long-running waits, or connector breadth becomes a real constraint, evaluate Activepieces as a private execution service while keeping ResolveX as the only customer UI.

## Infrastructure evaluation

No additional infrastructure is required for the current controlled local/private-preview phase.

Chatwoot typically needs a web process, background workers, PostgreSQL, Redis, persistent uploads, SMTP, backups, and health monitoring. Activepieces likewise benefits from a continuously running application/worker, PostgreSQL, Redis or queue services depending on configuration, and persistent operational monitoring. Running both inside a small free ARM allocation would create resource contention and a meaningful single-host failure domain.

If durable jobs are introduced, prefer a managed queue compatible with Vercel and Supabase before operating a general automation platform. Oracle Always Free may be suitable for experiments, subject to region capacity and eligibility, but not as an unreviewed production dependency for customer communications.

## ResolveX 2.0 implementation architecture

```text
Browser / widget / provider webhook
              |
        Next.js route handler
              |
   Supabase session + current membership
              |
      server-side workspace scope
              |
  +-----------+------------+----------------+
  |           |            |                |
 Inbox     AI employees   CRM/timeline    Flows
  |           |            |                |
  +-----------+----- approvals -------------+
                    |
             ResolveX tool gateway
                    |
       permission + idempotency + audit
                    |
       Composio / ElevenLabs / Plivo
```

External resource mapping always originates from the authenticated workspace. `organization_id`, external account IDs, voice agent IDs, call IDs, and phone-number IDs are stored together and rechecked on every request.

## External services and commercial dependencies

| Service         | Purpose                          | Cost/licensing note                                          | Status                                                                                               |
| --------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Supabase        | Postgres and authentication      | Existing provider                                            | Working and retained                                                                                 |
| OpenRouter      | Arlo text inference              | Usage-based                                                  | Working; real token/cost capture still required                                                      |
| Composio        | Managed customer OAuth and tools | Provider plan limits apply                                   | Credential and 1,000-toolkit catalog verified; real customer OAuth/action journey still needs testing |
| ElevenLabs      | Voice agents and browser voice   | Usage-based                                                  | Credential and 22-voice catalog verified; real agent creation and microphone session still required  |
| Plivo           | Numbers, SIP, calls              | Number rental and usage charges; regional compliance applies | Credential/inventory access verified; purchase deliberately blocked pending billing/compliance flow  |
| Dodo/Razorpay   | Subscription and usage billing   | Existing providers                                           | Retained                                                                                             |
| Resend          | Transactional email              | Provider plan and verified domain required                   | Existing integration retained                                                                        |

## Security findings and controls

- Provider keys remain server-only and are never prefixed with `NEXT_PUBLIC_`.
- New tables use `organization_id`, foreign keys, indexes, and RLS.
- Composio uses one stable provider user ID per workspace, not a model-supplied ID.
- Connected toolkit membership is verified against the employee before tool execution.
- Unknown or consequential tools require approval by default; read operations are allowed only by a conservative verb policy or explicit stored permission.
- Tool outputs remove common secret-bearing fields before storage/return.
- Tool executions use workspace-scoped idempotency keys.
- ElevenLabs agents are private and browser sessions use short-lived server-issued signed URLs.
- Phone purchase remains unavailable until an authenticated owner/admin request, billing authorization, compliance status, and explicit purchase implementation all agree.
- India numbers enter `pending_compliance`; they are not represented as active.

## Testing status

Verified locally after implementation:

- ESLint with no findings.
- Five unit tests for employee-template and tool-policy boundaries.
- Six Playwright checks across desktop Chromium and Pixel 7 emulation for the landing page, demo, and anonymous API rejection.
- Next.js 16.3.6 production compilation, TypeScript checking, and generation of all 86 routes.
- Database migration replay, two-workspace isolation, and read-only-member write denial inside a rolled-back transaction.
- Read-only live-provider checks for the Composio catalog, ElevenLabs voice catalog, and Plivo inventory endpoint.
- Dependency audit with zero known vulnerabilities.
- Browser console check with no errors on the local landing page.

Not yet truthfully verified end to end:

- Composio OAuth callback with a real customer application account.
- ElevenLabs agent creation, live microphone conversation, transcript callback, and usage reconciliation.
- Plivo number rental, SIP trunk configuration, inbound/outbound calls, transfer, recording, and carrier cost reconciliation.
- Provider webhook signatures and retries for calls and voice conversations.
- Full authenticated browser journeys using dedicated owner, agent, and viewer test accounts.
- Payment-authorized phone purchase and refund/reversal failure paths.

These operations must remain labelled setup-required or pending until their provider sandboxes/accounts and real test journeys pass.

## Launch recommendation

The rebuilt application is appropriate for local testing and then a controlled design-partner environment. Do not call it production-complete until migrations are applied to a staging database, external provider journeys above pass, durable jobs and monitoring exist, RLS tests cover every new table, and the phone billing/compliance workflow can complete and reverse safely.
