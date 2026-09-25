import assert from "node:assert/strict";
import test from "node:test";
import { voiceIncluded, voiceSpendCeilingMinor } from "../src/lib/pricing";

test("free trials include text only, never voice or phone minutes", () => {
  assert.equal(voiceIncluded("trialing"), false);
  assert.equal(voiceSpendCeilingMinor(5000, "trialing"), 0);
});

test("paid workspaces keep their configured voice budget", () => {
  assert.equal(voiceIncluded("active"), true);
  assert.equal(voiceSpendCeilingMinor(5000, "active"), 5000);
});
