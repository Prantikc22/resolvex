import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultToolAccess,
  sanitizeToolOutput,
} from "../src/lib/security/tool-policy";

test("read-only tools are allowed by default", () => {
  assert.equal(defaultToolAccess("GMAIL_LIST_MESSAGES"), "allow");
  assert.equal(defaultToolAccess("HUBSPOT_GET_CONTACT"), "allow");
});

test("consequential and unknown tools require approval", () => {
  assert.equal(defaultToolAccess("GMAIL_SEND_EMAIL"), "approval_required");
  assert.equal(defaultToolAccess("SHOPIFY_REFUND_ORDER"), "approval_required");
  assert.equal(defaultToolAccess("CUSTOM_DO_THING"), "approval_required");
});

test("stored tool output drops credential-like fields recursively", () => {
  assert.deepEqual(
    sanitizeToolOutput({
      id: "record_1",
      access_token: "secret",
      nested: { apiKey: "secret", name: "Visible" },
    }),
    { id: "record_1", nested: { name: "Visible" } },
  );
});
