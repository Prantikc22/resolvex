import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { requiredPaidSeats } from "@/lib/billing/seats";
import { paddleConfiguration } from "@/lib/billing/provider";
import { getPaddle } from "@/lib/billing/paddle";
import { pricing } from "@/lib/pricing";

const agentsSchema = z.object({ agents: z.number().int().min(1).max(500) });
const manageable = (role: string | null) =>
  role === "owner" || role === "admin";

type StoredSubscription = {
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown> | null;
};

function publicSubscription(row: StoredSubscription | null) {
  const metadata = row?.metadata ?? {};
  return row
    ? {
        id: row.provider_subscription_id,
        plan: row.plan,
        status: row.status,
        agents: Number(metadata.agents ?? 1),
        pendingAgents: null,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: Boolean(metadata.cancel_at_period_end),
        seatPaymentPending: false,
        shortUrl: null,
      }
    : null;
}

async function currentSubscription(
  supabase: Awaited<ReturnType<typeof getCurrentOrganization>>["supabase"],
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "provider,provider_customer_id,provider_subscription_id,plan,status,current_period_end,metadata",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data as StoredSubscription | null;
}

function currentEnvironmentSubscription(row: StoredSubscription | null) {
  if (!row || row.provider !== "paddle") return null;
  const configuredEnvironment = paddleConfiguration().environment;
  const storedEnvironment = row.metadata?.paddle_environment;
  return storedEnvironment === configuredEnvironment ||
    (storedEnvironment == null && configuredEnvironment === "sandbox")
    ? row
    : null;
}

async function usageSummary(
  supabase: Awaited<ReturnType<typeof getCurrentOrganization>>["supabase"],
  organizationId: string,
  subscription: StoredSubscription | null,
) {
  const rawStart = subscription?.metadata?.period_start;
  const fallback = new Date();
  fallback.setUTCDate(1);
  fallback.setUTCHours(0, 0, 0, 0);
  const parsed = typeof rawStart === "string" ? new Date(rawStart) : fallback;
  const periodStart = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  const { data, error } = await supabase
    .from("usage_events")
    .select("event_type,quantity")
    .eq("organization_id", organizationId)
    .in("event_type", ["ai_resolution", "ai_allowance"])
    .gte("created_at", periodStart.toISOString());
  if (error) throw error;
  const resolutions = (data ?? [])
    .filter((event) => event.event_type === "ai_resolution")
    .reduce((sum, event) => sum + Number(event.quantity ?? 0), 0);
  const allowanceUsed = (data ?? [])
    .filter((event) => event.event_type === "ai_allowance")
    .reduce((sum, event) => sum + Number(event.quantity ?? 0), 0);
  const billableResolutions = Math.max(
    0,
    resolutions - pricing.includedResolutions,
  );
  return {
    resolutions,
    includedResolutions: pricing.includedResolutions,
    allowanceUsed,
    allowanceRemaining: Math.max(
      0,
      pricing.includedResolutions - allowanceUsed,
    ),
    billableResolutions,
    estimatedOverage: billableResolutions * pricing.resolution,
    periodStart: periodStart.toISOString(),
  };
}

function paddleError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Paddle could not complete the billing request.";
}

export async function paddleGet() {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!organizationId)
    return NextResponse.json(
      { error: "Complete workspace setup first." },
      { status: 409 },
    );
  if (!manageable(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can manage billing." },
      { status: 403 },
    );
  try {
    const row = currentEnvironmentSubscription(
      await currentSubscription(supabase, organizationId),
    );
    return NextResponse.json({
      provider: "paddle",
      configured: paddleConfiguration().configured,
      subscription: publicSubscription(row),
      requiredAgents: await requiredPaidSeats(supabase, organizationId),
      usage: await usageSummary(supabase, organizationId, row),
    });
  } catch (error) {
    console.error("Paddle billing read failed", error);
    return NextResponse.json(
      { error: "Could not load billing." },
      { status: 500 },
    );
  }
}

export async function paddlePost(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!organizationId)
    return NextResponse.json(
      { error: "Complete workspace setup first." },
      { status: 409 },
    );
  if (!manageable(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can manage billing." },
      { status: 403 },
    );
  const parsed = agentsSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  const requiredAgents = await requiredPaidSeats(supabase, organizationId);
  if (parsed.data.agents < requiredAgents)
    return NextResponse.json(
      { error: `This workspace requires ${requiredAgents} paid seats.` },
      { status: 409 },
    );
  const config = paddleConfiguration();
  if (!config.configured || !config.clientToken || !config.seatPriceId)
    return NextResponse.json(
      { error: "Paddle checkout is not configured." },
      { status: 503 },
    );
  const existing = currentEnvironmentSubscription(
    await currentSubscription(supabase, organizationId),
  );
  if (
    existing &&
    ["active", "trialing", "past_due"].includes(existing.status ?? "")
  ) {
    return NextResponse.json({
      reused: true,
      provider: "paddle",
      subscription: publicSubscription(existing),
    });
  }
  const transaction = await getPaddle().transactions.create({
    items: [{ priceId: config.seatPriceId, quantity: parsed.data.agents }],
    checkout: { url: "https://getresolvex.com/checkout" },
    customData: {
      organization_id: organizationId,
      user_id: user.id,
      plan: "one",
      agents: parsed.data.agents,
      paddle_environment: config.environment,
    },
  });
  return NextResponse.json({
    provider: "paddle",
    clientToken: config.clientToken,
    environment: config.environment,
    transactionId: transaction.id,
    agents: parsed.data.agents,
    customer: { email: user.email ?? "" },
  });
}

export async function paddlePatch(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 409 },
    );
  if (!manageable(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can manage billing." },
      { status: 403 },
    );
  const parsed = agentsSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  const requiredAgents = await requiredPaidSeats(supabase, organizationId);
  if (parsed.data.agents < requiredAgents)
    return NextResponse.json(
      {
        error: `Remove paid teammates before reducing below ${requiredAgents} seats.`,
      },
      { status: 409 },
    );
  const config = paddleConfiguration();
  if (!config.seatPriceId)
    return NextResponse.json(
      { error: "Paddle seat pricing is not configured." },
      { status: 503 },
    );
  try {
    const current = await currentSubscription(supabase, organizationId);
    const id = current?.provider_subscription_id;
    if (!current || !id?.startsWith("sub_"))
      return NextResponse.json(
        { error: "No Paddle subscription is available." },
        { status: 404 },
      );
    if (!["active", "trialing"].includes(current.status ?? ""))
      return NextResponse.json(
        { error: "Resolve payment status before changing seats." },
        { status: 409 },
      );
    const currentAgents = Number(current.metadata?.agents ?? 1);
    const increasing = parsed.data.agents > currentAgents;
    const updated = await getPaddle().subscriptions.update(id, {
      items: [{ priceId: config.seatPriceId, quantity: parsed.data.agents }],
      prorationBillingMode: increasing
        ? "prorated_immediately"
        : "prorated_next_billing_period",
      onPaymentFailure: "prevent_change",
      customData: {
        ...(current.metadata ?? {}),
        organization_id: organizationId,
        plan: "one",
        agents: parsed.data.agents,
      },
    });
    const metadata = {
      ...(current.metadata ?? {}),
      agents: parsed.data.agents,
      seat_change_requested_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: updated.status,
        current_period_end:
          updated.currentBillingPeriod?.endsAt ?? current.current_period_end,
        metadata,
      })
      .eq("organization_id", organizationId)
      .eq("provider_subscription_id", id);
    if (error) throw error;
    return NextResponse.json({
      provider: "paddle",
      subscription: publicSubscription({
        ...current,
        status: updated.status,
        current_period_end:
          updated.currentBillingPeriod?.endsAt ?? current.current_period_end,
        metadata,
      }),
      chargedImmediately: increasing,
    });
  } catch (error) {
    return NextResponse.json({ error: paddleError(error) }, { status: 502 });
  }
}

export async function paddleDelete() {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 409 },
    );
  if (!manageable(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can manage billing." },
      { status: 403 },
    );
  try {
    const current = await currentSubscription(supabase, organizationId);
    const id = current?.provider_subscription_id;
    if (!current || !id?.startsWith("sub_"))
      return NextResponse.json(
        { error: "No Paddle subscription is available." },
        { status: 404 },
      );
    if (current.metadata?.cancel_at_period_end)
      return NextResponse.json({
        provider: "paddle",
        subscription: publicSubscription(current),
      });
    const canceled = await getPaddle().subscriptions.cancel(id, {
      effectiveFrom: "next_billing_period",
    });
    const metadata = {
      ...(current.metadata ?? {}),
      cancel_at_period_end: true,
      cancellation_requested_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("subscriptions")
      .update({
        current_period_end:
          canceled.currentBillingPeriod?.endsAt ?? current.current_period_end,
        metadata,
      })
      .eq("organization_id", organizationId)
      .eq("provider_subscription_id", id);
    if (error) throw error;
    return NextResponse.json({
      provider: "paddle",
      subscription: publicSubscription({ ...current, metadata }),
    });
  } catch (error) {
    return NextResponse.json({ error: paddleError(error) }, { status: 502 });
  }
}
