# ResolveX end-to-end test guide

## Local QAShift widget

1. Run `npm run dev`.
2. Open `http://127.0.0.1:3000/dev/chatbot`.
3. Open the launcher in the lower-right corner and ask a question about QAShift.
4. Confirm the answer says it came from the active employee and approved workspace knowledge.
5. Open ResolveX Inbox and confirm the conversation and both messages were saved.

The page deliberately loads the production embed exactly as a customer site does:

```html
<script
  src="https://www.getresolvex.com/resolvex-widget.js"
  data-workspace="24cd3b54-c64b-4d7c-b96e-3fd74da3d20e"
  async
></script>
```

## Composio actions

1. Open **Integrations** and connect an application.
2. After provider authorization, the callback must return to `https://www.getresolvex.com/app?view=integrations`.
3. Press **Browse actions** on the connected application.
4. Search for an action, select it, choose an active AI employee, and enter JSON arguments.
5. Run a read-only action directly. For a consequential action, confirm it appears in **Approvals**.
6. Press **Approve & run** and verify the approval changes to `executed` with a tool result.

## Phone and voice

Activating an employee's telephone channel provisions its managed voice runtime. A phone
number is deliberately **not** required for activation. ResolveX does not sell or
purchase phone numbers.

### Connect a customer-owned number (any country)

1. Activate an AI employee with **Telephone calls** enabled.
2. Buy and verify the number directly with the carrier. The carrier owns KYC,
   availability, rental, porting, taxes and regulatory compliance.
3. Open **Phone Numbers**, choose the country and carrier, then provide the E.164 number,
   SIP gateway and either SIP credentials or an IP allowlist.
4. Select the employee and submit the connection request.
5. ResolveX opens **Approvals**. Press **Approve & run**.
6. ResolveX creates the managed SIP route, resolves the connected number, and assigns
   inbound calls to the selected employee. Encrypted SIP credentials are removed from
   the approval payload after provisioning.

Place one inbound test call and verify **Calls** shows duration,
transcript, summary, result and the reconciled provider/ResolveX cost. Test human
transfer only after a real transfer destination is configured; verify the call and
Inbox handoff become `transferred`/waiting as appropriate.

### Website voice

Enable **Website voice** and **Human handoff** under Channels/widget settings. The
embedded widget should show **Talk to AI** and **Request a person**. Website voice uses
ElevenLabs and saves the transcript into the same Inbox conversation; Indian telephone
calling remains on the managed telephone runtime.

## Flows

ResolveX Flows use the native durable `employee_jobs` queue. Event-triggered flows are persisted before execution, scheduled flows are picked up by the Supabase Cron worker, and consequential Composio actions pause in Approvals before resuming automatically. Activepieces is deliberately not part of the runtime.

## Billing (Dodo Payments test mode)

1. Run `npm run dodo:setup` once per environment. It is idempotent and prints
   the product ID; set it as `DODO_PAYMENTS_PRODUCT_ID`.
2. Sign in as a workspace owner, open Billing, choose seats and press
   **Start ResolveX One**. You are redirected to Dodo's hosted checkout.
3. Pay with a test card that matches the checkout currency. USD:
   `4242 4242 4242 4242`. INR (India): `4576 2389 1277 1450` or UPI
   `success@upi`. Expiry 06/32, CVC 123. Declines: `4000 0000 0000 0002`
   (USD) or `4706 1312 1121 2123` (INR).
4. Dodo returns you to `/app?billing=return`; the workspace pulls the
   subscription directly and shows **Trial active** within a few seconds.
5. Change seats (increase = prorated immediately, decrease = next renewal),
   open **Manage subscription & invoices** for the customer portal, then
   cancel at period end.
6. Resolve a conversation that Arlo answered. Within a minute the worker
   reports it to the `ai.resolution` meter; check Dodo → Subscriptions →
   usage.
7. Choose **Annual** before checkout to test yearly billing ($144 / seat).
8. On an active paid plan, buy a voice pack under Billing → Voice minutes.
   Minutes appear after return; each finished call deducts its minutes.

## Required provider checks

- Managed telephony webhooks must return `401` without the configured unguessable token.
- ElevenLabs webhooks must return `401` without a valid HMAC signature.
- Re-delivering a telephony or website-voice event must not duplicate a call or ledger transaction.
- ResolveX exposes no phone-number search or purchase path; owner/admin approval covers SIP routing only.
- India purchase fails closed unless the managed provider accepts the supplied verification.
