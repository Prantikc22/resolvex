export const pricing = {
  agent: 15,
  includedResolutions: 50,
  resolution: 0,
  voicePlatformMinute: 0.02,
  trialDays: 7,
};

export function estimateResolveX(
  agents: number,
  resolutions: number,
  voiceMinutes = 0,
) {
  const seatCost = Math.max(1, agents) * pricing.agent;
  const billableResolutions = 0;
  const aiCost = 0;
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
