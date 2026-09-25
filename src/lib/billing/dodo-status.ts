import type { Subscription } from "dodopayments/resources/subscriptions";

/**
 * Maps a Dodo subscription onto the workspace status vocabulary shared with
 * the rest of the product (access checks, billing UI, allowance metering).
 */
export function workspaceStatus(
  subscription: Pick<
    Subscription,
    "status" | "trial_period_days" | "created_at" | "next_billing_date"
  >,
  now = Date.now(),
) {
  switch (subscription.status) {
    case "active": {
      // Still in the free trial only while the first charge is the trial-end
      // charge. Ending the trial early moves the next billing date, so the
      // workspace becomes "active" immediately.
      const trialDays = subscription.trial_period_days ?? 0;
      if (!trialDays) return "active";
      const trialEnds =
        new Date(subscription.created_at).getTime() + trialDays * 86_400_000;
      const nextBilling = new Date(subscription.next_billing_date).getTime();
      const firstChargeIsTrialEnd =
        Number.isFinite(nextBilling) &&
        Math.abs(nextBilling - trialEnds) < 86_400_000;
      return firstChargeIsTrialEnd && nextBilling > now ? "trialing" : "active";
    }
    case "pending":
      return "created";
    case "on_hold":
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "failed";
  }
}
