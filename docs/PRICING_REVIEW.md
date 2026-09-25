# ResolveX pricing review

Reviewed 25 September 2026 against the active product surface and current
public competitor pricing.

## Current launch price

- $15 per paid agent per month.
- 50 completed AI resolutions included per month.
- $0.39 per additional completed AI resolution.
- $0.02 per connected voice minute, plus carrier pass-through.
- Human collaborators, drafts, and human handoffs are not billed as AI
  resolutions.

## Recommendation

Keep the current numbers for launch. They are simple, easy to calculate in the
Dodo Payments usage-based product, and the outcome-based resolution charge is materially
below the commonly published $0.90-ish per-resolution AI add-on used by
Gorgias. Do not change the paid amount in the UI without creating and mapping
a new Dodo Payments product first.

The main improvement is clarity, not a price increase:

1. Call the $15 line an “agent seat” everywhere.
2. Keep “completed AI resolution” as the billing event and explicitly exclude
   drafts and human handoffs.
3. Keep voice minutes and carrier charges separate in the calculator.
4. Revisit the included allowance after launch telemetry. If most customers
   exhaust 50 quickly, test a 100-resolution allowance or volume packs as a
   new Dodo Payments product rather than silently changing existing subscriptions.
5. Add annual billing only when a real annual Dodo Payments product is provisioned.

This avoids the two common pricing traps: seat-only pricing that hides AI
usage, and AI pricing that looks cheap but has unclear resolution semantics.
Gorgias describes a combined helpdesk and outcome-based AI model; Zendesk
describes seat plans with outcome-based automated resolutions; Intercom also
separates seat pricing from Fin usage. ResolveX's current model is
competitive, but its advantage is the transparent definition of a billable
resolution rather than a claim that it is universally the cheapest option.

Reference pages checked:

- https://www.gorgias.com/pricing
- https://www.gorgias.com/blog/ai-agent-pricing
- https://www.zendesk.com/pricing/
- https://www.intercom.com/help/en/articles/9061614-fin-and-intercom-plans-explained
