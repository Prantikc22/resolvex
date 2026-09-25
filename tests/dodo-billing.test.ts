import assert from "node:assert/strict";
import test from "node:test";
import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";
import { workspaceStatus } from "../src/lib/billing/dodo-status";

const day = 86_400_000;

test("maps Dodo subscription states onto workspace access states", () => {
  const now = Date.parse("2026-09-25T00:00:00Z");
  const created = new Date(now - 2 * day).toISOString();
  const trialEnd = new Date(now + 5 * day).toISOString();
  const base = {
    created_at: created,
    trial_period_days: 7,
    next_billing_date: trialEnd,
  };
  assert.equal(workspaceStatus({ ...base, status: "active" }, now), "trialing");
  // Trial ended early: the next charge is a month out, not at trial end.
  assert.equal(
    workspaceStatus(
      {
        ...base,
        status: "active",
        next_billing_date: new Date(now + 30 * day).toISOString(),
      },
      now,
    ),
    "active",
  );
  // Trial finished naturally and the first month was charged.
  assert.equal(
    workspaceStatus(
      {
        ...base,
        created_at: new Date(now - 10 * day).toISOString(),
        next_billing_date: new Date(now + 27 * day).toISOString(),
        status: "active",
      },
      now,
    ),
    "active",
  );
  assert.equal(
    workspaceStatus({ ...base, status: "on_hold" }, now),
    "past_due",
  );
  assert.equal(workspaceStatus({ ...base, status: "pending" }, now), "created");
  assert.equal(
    workspaceStatus({ ...base, status: "cancelled" }, now),
    "cancelled",
  );
  assert.equal(workspaceStatus({ ...base, status: "failed" }, now), "failed");
});

test("accepts correctly signed Dodo webhooks and rejects tampering", () => {
  const secret = `whsec_${Buffer.from("resolvex-test-signing-key-32bytes!").toString("base64")}`;
  const body = JSON.stringify({
    business_id: "bus_test",
    type: "subscription.active",
    timestamp: new Date().toISOString(),
    data: { payload_type: "Subscription", subscription_id: "sub_test" },
  });
  const id = "msg_test_1";
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(id, timestamp, body);
  const headers = {
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": signature,
  };
  const client = new DodoPayments({
    bearerToken: "test",
    environment: "test_mode",
  });
  const event = client.webhooks.unwrap(body, { headers, key: secret });
  assert.equal(event.type, "subscription.active");
  assert.throws(() =>
    client.webhooks.unwrap(body.replace("sub_test", "sub_evil"), {
      headers,
      key: secret,
    }),
  );
});
