import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RazorpayEntity = {
  id?: string;
  order_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  customer_id?: string;
  current_start?: number;
  current_end?: number;
  quantity?: number;
  notes?: Record<string, string>;
};

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
    subscription?: { entity?: RazorpayEntity };
  };
};

function safeSignatureMatch(expected: string, received: string) {
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function billingStatus(eventName: string | undefined, entityStatus?: string) {
  if (
    eventName === "payment.captured" ||
    eventName === "order.paid" ||
    eventName === "subscription.activated"
  ) {
    return "active";
  }
  if (eventName === "payment.failed") return "failed";
  if (eventName === "subscription.cancelled") return "cancelled";
  return entityStatus ?? eventName ?? "updated";
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret missing" },
      { status: 503 },
    );
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!safeSignatureMatch(expected, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(body) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscription = event.payload?.subscription?.entity;
  const order = event.payload?.order?.entity;
  const payment = event.payload?.payment?.entity;
  const entity = subscription ?? order ?? payment;
  const notes = subscription?.notes ?? order?.notes ?? payment?.notes ?? {};
  const organizationId = notes.organization_id;

  if (!organizationId) {
    return NextResponse.json({ received: true, ignored: "workspace_unknown" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Billing store unavailable" },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: current } = await admin
    .from("subscriptions")
    .select("provider_subscription_id,current_period_end,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const metadata = (current?.metadata ?? {}) as Record<string, unknown>;
  const processedEventIds = Array.isArray(metadata.processed_event_ids)
    ? (metadata.processed_event_ids as string[])
    : [];

  if (eventId && processedEventIds.includes(eventId)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const providerId =
    subscription?.id ??
    current?.provider_subscription_id ??
    order?.id ??
    payment?.order_id ??
    payment?.id;
  const currentPeriodEnd = subscription?.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : current?.current_period_end;
  const nextEventIds = eventId
    ? [...processedEventIds.slice(-19), eventId]
    : processedEventIds;

  const { error } = await admin.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      provider: "razorpay",
      provider_customer_id: subscription?.customer_id,
      provider_subscription_id: providerId,
      status: billingStatus(event.event, entity?.status),
      plan: notes.plan ?? "one",
      current_period_end: currentPeriodEnd,
      metadata: {
        ...metadata,
        last_event: event.event,
        last_event_id: eventId || undefined,
        processed_event_ids: nextEventIds,
        razorpay_order_id: order?.id ?? payment?.order_id,
        razorpay_payment_id: payment?.id,
        amount: payment?.amount ?? order?.amount,
        currency: payment?.currency ?? order?.currency,
        agents: subscription?.quantity ?? notes.agents ?? metadata.agents,
        period_start: subscription?.current_start
          ? new Date(subscription.current_start * 1000).toISOString()
          : metadata.period_start,
        pending_agents:
          event.event === "subscription.updated"
            ? null
            : metadata.pending_agents,
        seat_change_scheduled:
          event.event === "subscription.updated"
            ? false
            : metadata.seat_change_scheduled,
        cancel_at_period_end:
          event.event === "subscription.cancelled"
            ? false
            : metadata.cancel_at_period_end,
      },
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
