import "server-only";
import DodoPayments from "dodopayments";
import type { Subscription } from "dodopayments/resources/subscriptions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dodoConfiguration } from "@/lib/billing/provider";
import { workspaceStatus } from "@/lib/billing/dodo-status";

export const DODO_RESOLUTION_EVENT = "ai.resolution";
export const DODO_VOICE_MINUTE_EVENT = "voice.minute";

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
  return organizationId;
}

/**
 * Seat increases are prorated and charged immediately; decreases take effect
 * at the next renewal so customers keep what they already paid for.
 */
export async function changeDodoSeats(
  subscriptionId: string,
  currentSeats: number,
  seats: number,
) {
  const productId = dodoConfiguration().productId;
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
type CallRow = {
  id: string;
  organization_id: string;
  duration_seconds: number;
};

/**
 * Sends completed AI resolutions and connected voice minutes to Dodo meters.
 * Event IDs are derived from our own row IDs, so a retry after a partial
 * failure is de-duplicated by Dodo rather than double-billed.
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
    const customerId = subscription.provider_customer_id as string;

    const [
      { data: resolutions, error: resolutionError },
      { data: calls, error: callError },
    ] = await Promise.all([
      admin
        .from("usage_events")
        .select("id,organization_id")
        .eq("organization_id", subscription.organization_id)
        .eq("event_type", "ai_resolution")
        .is("billing_reported_at", null)
        .gte("created_at", since)
        .limit(500),
      admin
        .from("calls")
        .select("id,organization_id,duration_seconds")
        .eq("organization_id", subscription.organization_id)
        .eq("status", "completed")
        .gt("duration_seconds", 0)
        .is("billing_reported_at", null)
        .gte("created_at", since)
        .limit(500),
    ]);
    if (resolutionError) throw resolutionError;
    if (callError) throw callError;

    const resolutionRows = (resolutions ?? []) as UsageRow[];
    const callRows = (calls ?? []) as CallRow[];
    const events = [
      ...resolutionRows.map((row) => ({
        event_id: `rx_res_${row.id}`,
        customer_id: customerId,
        event_name: DODO_RESOLUTION_EVENT,
        metadata: { organization_id: row.organization_id },
      })),
      ...callRows.map((row) => ({
        event_id: `rx_call_${row.id}`,
        customer_id: customerId,
        event_name: DODO_VOICE_MINUTE_EVENT,
        metadata: {
          organization_id: row.organization_id,
          minutes: Math.ceil(row.duration_seconds / 60),
        },
      })),
    ];
    if (!events.length) continue;

    await getDodo().usageEvents.ingest({ events });
    const reportedAt = new Date().toISOString();
    if (resolutionRows.length) {
      const { error: markError } = await admin
        .from("usage_events")
        .update({ billing_reported_at: reportedAt })
        .in(
          "id",
          resolutionRows.map((row) => row.id),
        );
      if (markError) throw markError;
    }
    if (callRows.length) {
      const { error: markError } = await admin
        .from("calls")
        .update({ billing_reported_at: reportedAt })
        .in(
          "id",
          callRows.map((row) => row.id),
        );
      if (markError) throw markError;
    }
    reported += events.length;
  }
  return { reported };
}
