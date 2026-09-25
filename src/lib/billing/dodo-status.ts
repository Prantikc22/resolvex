import type { Subscription } from "dodopayments/resources/subscriptions";

/**
 * Maps a Dodo subscription onto the workspace status vocabulary shared with
 * the rest of the product (access checks, billing UI, allowance metering).
 */
export function workspaceStatus(
  subscription: Pick<
    Subscription,
    "status" | "trial_period_days" | "created_at"
  >,
  now = Date.now(),
) {
  switch (subscription.status) {
    case "active": {
      const trialEnds =
        new Date(subscription.created_at).getTime() +
        (subscription.trial_period_days ?? 0) * 86_400_000;
      return trialEnds > now ? "trialing" : "active";
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
