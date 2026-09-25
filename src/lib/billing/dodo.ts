import "server-only";
import DodoPayments from "dodopayments";
import type { Subscription } from "dodopayments/resources/subscriptions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dodoConfiguration } from "@/lib/billing/provider";
import { workspaceStatus } from "@/lib/billing/dodo-status";

export const DODO_RESOLUTION_EVENT = "ai.resolution";

let instance: DodoPayments | null = null;

export function getDodo() {
  const config = dodoConfiguration();
  if (!config.apiKey)
    throw new Error("Dodo Payments API credentials are incomplete.");
  if (!instance) {
    instance = new DodoPayments({
      bearerToken: config.apiKey,
      webhookKey: config.webhookKey ?? null,
      environment: config.environment,
    });
  }
  return instance;
}

/** "year" for the annual product, otherwise "month". */
export function billingInterval(productId: unknown) {
  const annual = dodoConfiguration().annualProductId;
  return annual && productId === annual ? "year" : "month";
}

type StoredMetadata = Record<string, unknown>;

export function subscriptionMetadata(
  subscription: Subscription,
  existing: StoredMetadata,
  event?: { id?: string; type?: string },
): StoredMetadata {
  return {
    ...existing,
    dodo_environment: dodoConfiguration().environment,
    agents: subscription.quantity,
    product_id: subscription.product_id,
    period_start: subscription.previous_billing_date,
    subscribed_at: existing.subscribed_at ?? subscription.created_at,
    cancel_at_period_end: subscription.cancel_at_next_billing_date,
    pending_agents: null,
    seat_change_scheduled: false,
    ...(event?.type ? { last_event: event.type } : {}),
    ...(event?.id ? { last_event_id: event.id } : {}),
  };
}

/**
 * Upserts the workspace subscription row from an authoritative Dodo
 * subscription object. The organisation is taken from the metadata attached
 * at checkout, falling back to a customer already linked to a workspace.
 */
export async function syncDodoSubscription(
  admin: SupabaseClient,
  subscription: Subscription,
  event?: { id?: string; type?: string },
) {
  let organizationId =
    typeof subscription.metadata?.organization_id === "string"
      ? subscription.metadata.organization_id
      : null;
  if (!organizationId) {
    const { data } = await admin
      .from("subscriptions")
      .select("organization_id")
      .eq("provider", "dodo")
      .eq("provider_customer_id", subscription.customer.customer_id)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
  }
  if (!organizationId) return null;

  const { data: current, error: readError } = await admin
    .from("subscriptions")
    .select("provider,provider_subscription_id,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (readError) throw readError;
  // A replacement plan (e.g. monthly -> annual) must not displace the
  // working subscription until it has actually been paid for.
  const replaces = subscription.metadata?.replaces_subscription_id;
  if (
    replaces &&
    !["active", "trialing"].includes(workspaceStatus(subscription))
  ) {
    return organizationId;
  }
  // Never let a stale event for a replaced subscription overwrite the live one.
  if (
    current?.provider === "dodo" &&
    current.provider_subscription_id &&
    current.provider_subscription_id !== subscription.subscription_id &&
    ["cancelled", "expired", "failed"].includes(subscription.status)
  ) {
    return organizationId;
  }
  const existing =
    current?.provider === "dodo" &&
    current.provider_subscription_id === subscription.subscription_id
      ? ((current.metadata ?? {}) as StoredMetadata)
      : {};

  const { error } = await admin.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      provider: "dodo",
      provider_customer_id: subscription.customer.customer_id,
      provider_subscription_id: subscription.subscription_id,
      plan: "one",
      status: workspaceStatus(subscription),
      current_period_end: subscription.next_billing_date,
      metadata: subscriptionMetadata(subscription, existing, event),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw error;
  if (replaces) {
    await retireReplacedSubscription(admin, organizationId, subscription);
  }
  return organizationId;
}

/**
 * After a replacement subscription is paid, cancel the one it replaced and
 * refund that plan's unused paid time pro rata. Runs once per replacement.
 */
async function retireReplacedSubscription(
  admin: SupabaseClient,
  organizationId: string,
  replacement: Subscription,
) {
  const rawOldId = replacement.metadata?.replaces_subscription_id;
  if (typeof rawOldId !== "string" || !rawOldId) return;
  const oldId = rawOldId;
  const { data: row } = await admin
    .from("subscriptions")
    .select("metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const metadata = (row?.metadata ?? {}) as StoredMetadata;
  if (metadata.retired_subscription_id === oldId) return;

  const dodo = getDodo();
  const old = await dodo.subscriptions.retrieve(oldId);
  if (!["cancelled", "expired", "failed"].includes(old.status)) {
    await dodo.subscriptions.update(oldId, { status: "cancelled" });
  }

  let refundedMinor = 0;
  const periodStart = new Date(old.previous_billing_date).getTime();
  const periodEnd = new Date(old.next_billing_date).getTime();
  const remaining = (periodEnd - Date.now()) / (periodEnd - periodStart);
  if (Number.isFinite(remaining) && remaining > 0 && remaining < 1) {
    for await (const payment of dodo.payments.list({
      subscription_id: oldId,
      status: "succeeded",
    })) {
      if (payment.total_amount <= 0) continue;
      // List rows omit the cart; the full payment carries the line items.
      const full = await dodo.payments.retrieve(payment.payment_id);
      const line = full.product_cart?.[0];
      const amount = Math.floor(payment.total_amount * remaining);
      if (line && amount > 0) {
        await dodo.refunds.create({
          payment_id: payment.payment_id,
          reason: "Unused monthly time after switching to annual billing",
          items: [{ item_id: line.product_id, amount }],
        });
        refundedMinor = amount;
      }
      break;
    }
  }
  await admin
    .from("subscriptions")
    .update({
      metadata: {
        ...metadata,
        retired_subscription_id: oldId,
        retired_refund_minor: refundedMinor,
      },
    })
    .eq("organization_id", organizationId);
}

/**
 * Seat increases are prorated and charged immediately; decreases take effect
 * at the next renewal so customers keep what they already paid for.
 */
export async function changeDodoSeats(
  subscriptionId: string,
  currentSeats: number,
  seats: number,
  subscriptionProductId?: string | null,
) {
  // Stay on the customer's own product so annual plans remain annual.
  const productId = subscriptionProductId || dodoConfiguration().productId;
  if (!productId) throw new Error("Dodo Payments product is not configured.");
  const increasing = seats > currentSeats;
  await getDodo().subscriptions.changePlan(subscriptionId, {
    product_id: productId,
    quantity: seats,
    proration_billing_mode: increasing ? "prorated_immediately" : "do_not_bill",
    effective_at: increasing ? "immediately" : "next_billing_date",
    ...(increasing ? { on_payment_failure: "prevent_change" as const } : {}),
  });
  return { scheduled: !increasing };
}

type UsageRow = { id: number; organization_id: string };

/**
 * Sends completed AI resolutions to the Dodo meter. Event IDs are derived
 * from our own row IDs, so a retry after a partial failure is de-duplicated
 * by Dodo rather than double-billed. Voice is prepaid (see voice-credits).
 */
export async function reportDodoUsage(admin: SupabaseClient) {
  const config = dodoConfiguration();
  if (!config.configured) return { reported: 0, skipped: "not_configured" };
  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("organization_id,provider_customer_id,metadata")
    .eq("provider", "dodo")
    .in("status", ["active", "trialing", "past_due"])
    .not("provider_customer_id", "is", null);
  if (error) throw error;

  let reported = 0;
  for (const subscription of subscriptions ?? []) {
    const metadata = (subscription.metadata ?? {}) as StoredMetadata;
    if (metadata.dodo_environment !== config.environment) continue;
    const since =
      typeof metadata.subscribed_at === "string"
        ? metadata.subscribed_at
        : null;
    if (!since) continue;

    const { data: resolutions, error: resolutionError } = await admin
      .from("usage_events")
      .select("id,organization_id")
      .eq("organization_id", subscription.organization_id)
      .eq("event_type", "ai_resolution")
      .is("billing_reported_at", null)
      .gte("created_at", since)
      .limit(500);
    if (resolutionError) throw resolutionError;
    const rows = (resolutions ?? []) as UsageRow[];
    if (!rows.length) continue;

    await getDodo().usageEvents.ingest({
      events: rows.map((row) => ({
        event_id: `rx_res_${row.id}`,
        customer_id: subscription.provider_customer_id as string,
        event_name: DODO_RESOLUTION_EVENT,
        metadata: { organization_id: row.organization_id },
      })),
    });
    const { error: markError } = await admin
      .from("usage_events")
      .update({ billing_reported_at: new Date().toISOString() })
      .in(
        "id",
        rows.map((row) => row.id),
      );
    if (markError) throw markError;
    reported += rows.length;
  }
  return { reported };
}
