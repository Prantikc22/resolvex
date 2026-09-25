import assert from "node:assert/strict";
import test from "node:test";
import {
  subscriptionSeats,
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

test("seat count falls back to one", () => {
  assert.equal(subscriptionSeats(paid), 3);
  assert.equal(subscriptionSeats(null), 1);
  assert.equal(subscriptionSeats({ metadata: { agents: "x" } }), 1);
});
