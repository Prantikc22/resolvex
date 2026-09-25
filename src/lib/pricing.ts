export const pricing = {
  agent: 15,
  includedResolutions: 50,
  resolution: 0.39,
  voicePlatformMinute: 0.2,
  trialDays: 7,
};

/**
 * Hard ceilings on everything that spends provider money. Sized so that even
 * a workspace hitting every ceiling costs less than its seat revenue.
 */
export const usageGuards = {
  /** New AI-answered widget conversations per seat per UTC day. */
  aiConversationsPerSeatPerDay: 150,
  /** AI employee actions (LLM runs and app tool calls) per seat per month. */
  employeeActionsPerSeatPerMonth: 2000,
  /** Shortest allowed interval for a recurring flow, in minutes. */
  minFlowIntervalMinutes: 15,
  /** Attention brief refreshes per workspace per hour. */
  attentionPerHour: 20,
  /** CRM decision insights per workspace per hour. */
  crmInsightsPerHour: 60,
  /** Public marketing assistant: per visitor per 10 minutes, and per day. */
  publicAssistantPerVisitor: 12,
  publicAssistantPerDay: 3000,
};

type VoiceSubscription =
  | {
      status?: string | null;
      provider?: string | null;
      metadata?: Record<string, unknown> | null;
    }
  | null
  | undefined;

/**
 * Voice and phone have a real per-minute provider cost, so they run only on
 * an active, paid subscription that is not scheduled to cancel. Trials,
 * failed payments and pending cancellations are text-only, so no minute can
 * ever be consumed that we are unable to bill.
 */
export function voiceIncluded(subscription: VoiceSubscription) {
  return (
    subscription?.provider === "dodo" &&
    subscription.status === "active" &&
    !subscription.metadata?.cancel_at_period_end
  );
}

/** Monthly voice spend ceiling in minor units; zero whenever voice is off. */
export function voiceSpendCeilingMinor(
  budgetMinor: number,
  subscription: VoiceSubscription,
) {
  return voiceIncluded(subscription) ? budgetMinor : 0;
}

/** Paid seats on a subscription row, never less than one. */
export function subscriptionSeats(subscription: VoiceSubscription) {
  return Math.max(1, Number(subscription?.metadata?.agents ?? 1) || 1);
}

export function estimateResolveX(
  agents: number,
  resolutions: number,
  voiceMinutes = 0,
) {
  const seatCost = Math.max(1, agents) * pricing.agent;
  const billableResolutions = Math.max(
    0,
    resolutions - pricing.includedResolutions,
  );
  const aiCost = billableResolutions * pricing.resolution;
  const voicePlatformCost =
    Math.max(0, voiceMinutes) * pricing.voicePlatformMinute;
  return {
    seatCost,
    billableResolutions,
    aiCost,
    voicePlatformCost,
    total: seatCost + aiCost + voicePlatformCost,
  };
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}
