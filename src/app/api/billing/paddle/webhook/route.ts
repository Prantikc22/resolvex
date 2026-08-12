import { EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddle } from "@/lib/billing/paddle";

const subscriptionEvents = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionTrialing,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionResumed,
  EventName.SubscriptionCanceled,
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

async function syncSubscription(event: EventEntity) {
  if (!subscriptionEvents.has(event.eventType)) return;
  const data = asRecord(event.data);
  const custom = asRecord(data.customData);
  const organizationId = custom.organization_id;
  if (typeof organizationId !== "string") return;
  const items = Array.isArray(data.items)
    ? (data.items as Array<Record<string, unknown>>)
    : [];
  const first = items[0] ?? {};
  const currentPeriod = asRecord(data.currentBillingPeriod);
  const scheduledChange = asRecord(data.scheduledChange);
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("subscriptions")
    .select("metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const existing = asRecord(current?.metadata);
  const agents = Number(first.quantity ?? custom.agents ?? existing.agents ?? 1);
  const periodStart =
    typeof currentPeriod.startsAt === "string"
      ? currentPeriod.startsAt
      : existing.period_start;
  const periodEnd =
    typeof currentPeriod.endsAt === "string" ? currentPeriod.endsAt : null;
  const { error } = await admin.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      provider: "paddle",
      provider_customer_id:
        typeof data.customerId === "string" ? data.customerId : null,
      provider_subscription_id:
        typeof data.id === "string" ? data.id : null,
      plan: typeof custom.plan === "string" ? custom.plan : "one",
      status: typeof data.status === "string" ? data.status : event.eventType,
      current_period_end: periodEnd,
      metadata: {
        ...existing,
        agents,
        period_start: periodStart,
        price_id: asRecord(first.price).id,
        cancel_at_period_end: scheduledChange.action === "cancel",
        scheduled_change:
          Object.keys(scheduledChange).length > 0 ? scheduledChange : null,
        last_event: event.eventType,
        last_event_id: event.eventId,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw error;
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ?? "";
  if (!signature || !rawBody || !secret) {
    return NextResponse.json(
      { error: "Paddle webhook is not configured." },
      { status: 400 },
    );
  }
  try {
    const event = await getPaddle().webhooks.unmarshal(
      rawBody,
      secret,
      signature,
    );
    const admin = createAdminClient();
    const { error: ledgerError } = await admin
      .from("billing_webhook_events")
      .insert({
        event_id: event.eventId,
        provider: "paddle",
        event_type: event.eventType,
        occurred_at: event.occurredAt,
      });
    if (ledgerError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (ledgerError) throw ledgerError;
    try {
      await syncSubscription(event);
    } catch (error) {
      await admin
        .from("billing_webhook_events")
        .delete()
        .eq("event_id", event.eventId);
      throw error;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
