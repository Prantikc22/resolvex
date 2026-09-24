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

1. Activate an AI employee with the Voice channel.
2. Open **Phone Numbers**, select that employee, country, and number type, then search live Plivo inventory.
3. For India, enter an **accepted** Plivo compliance application ID. The Plivo account must use the India data region.
4. Press **Request**, then open **Approvals**. The number has not been purchased yet.
5. Review the displayed number and charges, then press **Approve & run**. This is the step that can incur Plivo rental/setup charges.
6. ResolveX creates the Plivo application, purchases and attaches the number, provisions an outbound SIP trunk, imports the number into ElevenLabs, and assigns the employee.
7. Place one inbound test call. Verify **Calls** shows duration, transcript, summary, result, Plivo carrier cost, and the ResolveX voice-platform charge.
8. Test a human transfer only after a real transfer destination is configured on the ElevenLabs agent and permitted by the SIP trunk. Verify the call status becomes `transferred`.

Do not expect US results when Plivo returns an empty US local/toll-free inventory response. That is provider account inventory or eligibility, not a locally generated list.

## Flows

ResolveX quick rules are available immediately for message priority, tags, and human handoff. Multi-step Activepieces flows require `ACTIVEPIECES_URL` and `ACTIVEPIECES_EMBED_SIGNING_KEY`. Activepieces' embedded builder is an Embed/Enterprise feature; without it, the Flows page links to the external Activepieces builder instead of displaying a non-functional mock editor.

## Required provider checks

- Plivo webhooks must return `401` without a valid V3 signature.
- ElevenLabs webhooks must return `401` without a valid HMAC signature.
- Re-delivering an ElevenLabs event must not duplicate the call or ledger transaction.
- No phone purchase occurs before the owner/admin confirmation in Approvals.
- India purchase fails closed unless Plivo accepts the supplied compliance application.
