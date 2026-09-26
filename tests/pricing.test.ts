import assert from "node:assert/strict";
import test from "node:test";
import {
  subscriptionSeats,
  voiceLimits,
  voicePacks,
  voiceIncluded,
  voiceSpendCeilingMinor,
} from "../src/lib/pricing";

const paid = { provider: "dodo", status: "active", metadata: { agents: 3 } };

test("voice runs only on an active, paid, non-cancelling subscription", () => {
  assert.equal(voiceIncluded(paid), true);
  assert.equal(voiceSpendCeilingMinor(5000, paid), 5000);
  for (const blocked of [
    { ...paid, status: "trialing" },
    { ...paid, status: "past_due" },
    { ...paid, status: "cancelled" },
    { ...paid, metadata: { cancel_at_period_end: true } },
    { ...paid, provider: "paddle" },
    null,
  ]) {
    assert.equal(voiceIncluded(blocked), false);
    assert.equal(voiceSpendCeilingMinor(5000, blocked), 0);
  }
});

test("complimentary workspaces keep voice while active", () => {
  assert.equal(
    voiceIncluded({ provider: "complimentary", status: "active" }),
    true,
  );
  assert.equal(
    voiceIncluded({ provider: "complimentary", status: "cancelled" }),
    false,
  );
});

test("seat count falls back to one", () => {
  assert.equal(subscriptionSeats(paid), 3);
  assert.equal(subscriptionSeats(null), 1);
  assert.equal(subscriptionSeats({ metadata: { agents: "x" } }), 1);
});

test("every voice pack clears worst-case provider cost after payment fees", () => {
  // ElevenLabs burst $0.16/min + LLM $0.01; Dodo up to 6% + $0.40 per payment.
  const worstCostPerMinute = 0.17;
  for (const pack of voicePacks) {
    const netRevenue = pack.price * (1 - 0.06) - 0.4;
    assert.ok(
      netRevenue > pack.minutes * worstCostPerMinute,
      `${pack.id} would lose money at burst rates`,
    );
  }
});

test("a call can never outrun prepaid minutes", () => {
  assert.ok(voiceLimits.startMinimumMinutes >= voiceLimits.callCapMinutes);
  assert.ok(voiceLimits.suspendBelowMinutes >= voiceLimits.callCapMinutes);
});
