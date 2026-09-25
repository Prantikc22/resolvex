import { NextResponse } from "next/server";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDodo, syncDodoSubscription } from "@/lib/billing/dodo";
import { dodoConfiguration } from "@/lib/billing/provider";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id") ?? "";
  const key = dodoConfiguration().webhookKey;
  if (!key || !webhookId || !rawBody) {
    return NextResponse.json(
      { error: "Dodo Payments webhook is not configured." },
      { status: 400 },
    );
  }

  let event: ReturnType<ReturnType<typeof getDodo>["webhooks"]["unwrap"]>;
  try {
    event = getDodo().webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": request.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      },
      key,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: ledgerError } = await admin
    .from("billing_webhook_events")
    .insert({
      event_id: webhookId,
      provider: "dodo",
      event_type: event.type,
      occurred_at: event.timestamp,
    });
  if (ledgerError?.code === "23505")
    return NextResponse.json({ received: true, duplicate: true });
  if (ledgerError) {
    console.error("Dodo webhook ledger failed", ledgerError);
    return NextResponse.json(
      { error: "Webhook storage failed." },
      { status: 500 },
    );
  }

  try {
    if (event.type.startsWith("subscription.")) {
      await syncDodoSubscription(admin, event.data as Subscription, {
        id: webhookId,
        type: event.type,
      });
    } else if (
      (event.type === "payment.succeeded" || event.type === "payment.failed") &&
      "subscription_id" in event.data &&
      typeof event.data.subscription_id === "string"
    ) {
      // Payments carry only a reference; refresh the subscription itself so
      // renewals and failed charges move the workspace status immediately.
      const subscription = await getDodo().subscriptions.retrieve(
        event.data.subscription_id,
      );
      await syncDodoSubscription(admin, subscription, {
        id: webhookId,
        type: event.type,
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Release the ledger entry so Dodo's retry is processed rather than skipped.
    await admin
      .from("billing_webhook_events")
      .delete()
      .eq("event_id", webhookId);
    console.error("Dodo webhook processing failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
