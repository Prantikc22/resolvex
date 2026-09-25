export const pricing = {
  agent: 15,
  includedResolutions: 50,
  resolution: 0.39,
  voicePlatformMinute: 0.12,
  trialDays: 7,
};

/**
 * Voice and phone have a real per-minute provider cost, so free trials
 * include Arlo text replies only; voice starts with the paid subscription.
 */
export function voiceIncluded(subscriptionStatus: string | null | undefined) {
  return subscriptionStatus !== "trialing";
}

/** Monthly voice spend ceiling in minor units; zero during a free trial. */
export function voiceSpendCeilingMinor(
  budgetMinor: number,
  subscriptionStatus: string | null | undefined,
) {
  return voiceIncluded(subscriptionStatus) ? budgetMinor : 0;
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
