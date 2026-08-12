import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddle } from "@/lib/billing/paddle";
import { paddleConfiguration } from "@/lib/billing/provider";
import { pricing } from "@/lib/pricing";

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

async function processUsage(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = paddleConfiguration();
  if (!config.overagePriceId)
    return NextResponse.json({ error: "Paddle overage price is missing." }, { status: 503 });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("organization_id,provider_subscription_id,metadata")
    .eq("provider", "paddle")
    .in("status", ["active", "trialing"])
    .not("provider_subscription_id", "is", null);
  if (error) throw error;
  let submitted = 0;
  for (const subscription of subscriptions ?? []) {
    const metadata = (subscription.metadata ?? {}) as Record<string, unknown>;
    const storedEnvironment = metadata.paddle_environment;
    if (
      storedEnvironment !== config.environment &&
      !(storedEnvironment == null && config.environment === "sandbox")
    )
      continue;
    const periodStart =
      typeof metadata.period_start === "string" ? metadata.period_start : null;
    if (!periodStart) continue;
    const providerSubscriptionId = subscription.provider_subscription_id;
    const remote = await getPaddle().subscriptions.get(providerSubscriptionId);
    const periodEnd = remote.currentBillingPeriod?.endsAt;
    const millisecondsUntilRenewal = periodEnd
      ? new Date(periodEnd).getTime() - Date.now()
      : Number.POSITIVE_INFINITY;
    if (
      !periodEnd ||
      millisecondsUntilRenewal > 90 * 60 * 1000 ||
      millisecondsUntilRenewal <= 0
    )
      continue;
    const { data: events, error: usageError } = await admin
      .from("usage_events")
      .select("quantity")
      .eq("organization_id", subscription.organization_id)
      .eq("event_type", "ai_resolution")
      .gte("created_at", periodStart)
      .lt("created_at", periodEnd);
    if (usageError) throw usageError;
    const completed = (events ?? []).reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0,
    );
    const quantity = Math.max(0, completed - pricing.includedResolutions);
    if (!quantity) continue;
    const { data: existingBatch, error: existingBatchError } = await admin
      .from("usage_billing_batches")
      .select("id,status")
      .eq("organization_id", subscription.organization_id)
      .eq("provider_subscription_id", providerSubscriptionId)
      .eq("period_start", periodStart)
      .maybeSingle();
    if (existingBatchError) throw existingBatchError;
    if (existingBatch?.status === "submitted") continue;
    const { data: batch, error: batchError } = existingBatch
      ? await admin
          .from("usage_billing_batches")
          .update({
            period_end: periodEnd,
            quantity,
            status: "pending",
            error: null,
            updated_at: now,
          })
          .eq("id", existingBatch.id)
          .select("id,status")
          .single()
      : await admin
      .from("usage_billing_batches")
      .insert({
        organization_id: subscription.organization_id,
        provider_subscription_id: providerSubscriptionId,
        period_start: periodStart,
        period_end: periodEnd,
        quantity,
        status: "pending",
        updated_at: now,
      })
      .select("id,status")
      .single();
    if (batchError) throw batchError;
    if (!batch || batch.status === "submitted") continue;
    try {
      await getPaddle().subscriptions.createOneTimeCharge(providerSubscriptionId, {
        effectiveFrom: "next_billing_period",
        items: [{ priceId: config.overagePriceId, quantity }],
        onPaymentFailure: "prevent_change",
      });
      await admin
        .from("usage_billing_batches")
        .update({ status: "submitted", provider_reference: providerSubscriptionId, error: null, updated_at: new Date().toISOString() })
        .eq("id", batch.id);
      submitted += 1;
    } catch (chargeError) {
      await admin
        .from("usage_billing_batches")
        .update({ status: "failed", error: chargeError instanceof Error ? chargeError.message.slice(0, 500) : "Paddle charge failed", updated_at: new Date().toISOString() })
        .eq("id", batch.id);
      throw chargeError;
    }
  }
  return NextResponse.json({ processed: subscriptions?.length ?? 0, submitted });
}

export const GET = processUsage;
export const POST = processUsage;
