import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { requiredPaidSeats } from "@/lib/billing/seats";
import { dodoConfiguration } from "@/lib/billing/provider";
import {
  billingInterval,
  changeDodoSeats,
  getDodo,
  syncDodoSubscription,
} from "@/lib/billing/dodo";
import { publicAppUrl } from "@/lib/app-url";
import { pricing } from "@/lib/pricing";

const agentsSchema = z.object({ agents: z.number().int().min(1).max(500) });
const checkoutSchema = agentsSchema.extend({
  interval: z.enum(["month", "year"]).default("month"),
});
const syncSchema = z.object({ subscriptionId: z.string().min(4).max(80) });
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

type Organization = Awaited<ReturnType<typeof getCurrentOrganization>>;

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
        interval: billingInterval(metadata.product_id),
        cancelAtPeriodEnd: Boolean(metadata.cancel_at_period_end),
        seatPaymentPending: false,
        shortUrl: null,
      }
    : null;
}

async function currentSubscription(
  supabase: Organization["supabase"],
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

/** Only a Dodo subscription from the configured test/live mode counts. */
function currentEnvironmentSubscription(row: StoredSubscription | null) {
  if (!row || row.provider !== "dodo") return null;
  return row.metadata?.dodo_environment === dodoConfiguration().environment
    ? row
    : null;
}

async function usageSummary(
  supabase: Organization["supabase"],
  organizationId: string,
  subscription: StoredSubscription | null,
) {
  const rawStart = subscription?.metadata?.period_start;
  const fallback = new Date();
  fallback.setUTCDate(1);
  fallback.setUTCHours(0, 0, 0, 0);
  const parsed = typeof rawStart === "string" ? new Date(rawStart) : fallback;
  const periodStart =
    Number.isNaN(parsed.getTime()) || parsed > new Date() ? fallback : parsed;
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
  const included =
    billingInterval(subscription?.metadata?.product_id) === "year"
      ? pricing.includedResolutionsAnnual
      : pricing.includedResolutions;
  const billableResolutions = Math.max(0, resolutions - included);
  return {
    resolutions,
    includedResolutions: included,
    allowanceUsed,
    allowanceRemaining: Math.max(0, included - allowanceUsed),
    billableResolutions,
    estimatedOverage: billableResolutions * pricing.resolution,
    periodStart: periodStart.toISOString(),
  };
}

function dodoError(error: unknown) {
  if (error && typeof error === "object") {
    const item = error as { status?: number; error?: { message?: unknown } };
    if (item.status === 401)
      return "Dodo Payments rejected the API key. Check DODO_PAYMENTS_API_KEY and its test/live mode.";
    if (typeof item.error?.message === "string") return item.error.message;
  }
  return error instanceof Error
    ? error.message
    : "Dodo Payments could not complete the billing request.";
}

async function authorize(organization: Organization) {
  const { user, organizationId, membershipRole } = organization;
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
  return null;
}

export async function dodoGet() {
  const organization = await getCurrentOrganization();
  const denied = await authorize(organization);
  if (denied) return denied;
  const { supabase, organizationId } = organization;
  try {
    const row = currentEnvironmentSubscription(
      await currentSubscription(supabase, organizationId!),
    );
    const config = dodoConfiguration();
    return NextResponse.json({
      provider: "dodo",
      configured: config.configured,
      annualAvailable: Boolean(config.annualProductId),
      environment: config.environment,
      subscription: publicSubscription(row),
      requiredAgents: await requiredPaidSeats(supabase, organizationId!),
      usage: await usageSummary(supabase, organizationId!, row),
    });
  } catch (error) {
    console.error("Dodo billing read failed", error);
    return NextResponse.json(
      { error: "Could not load billing." },
      { status: 500 },
    );
  }
}

/** Starts a hosted Dodo checkout, or syncs a subscription after return. */
export async function dodoPost(request: Request) {
  const organization = await getCurrentOrganization();
  const denied = await authorize(organization);
  if (denied) return denied;
  const { supabase, user, organizationId } = organization;
  const body = await request.json().catch(() => null);

  const sync = syncSchema.safeParse(body);
  if (sync.success) return dodoSync(organization, sync.data.subscriptionId);

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  const requiredAgents = await requiredPaidSeats(supabase, organizationId!);
  if (parsed.data.agents < requiredAgents)
    return NextResponse.json(
      { error: `This workspace requires ${requiredAgents} paid seats.` },
      { status: 409 },
    );
  const config = dodoConfiguration();
  const productId =
    parsed.data.interval === "year" ? config.annualProductId : config.productId;
  if (!config.configured || !productId)
    return NextResponse.json(
      {
        error:
          parsed.data.interval === "year"
            ? "Annual billing is not configured yet."
            : "Dodo Payments checkout is not configured.",
      },
      { status: 503 },
    );
  const existing = currentEnvironmentSubscription(
    await currentSubscription(supabase, organizationId!),
  );
  if (
    existing &&
    ["active", "trialing", "past_due"].includes(existing.status ?? "")
  ) {
    return NextResponse.json({
      reused: true,
      provider: "dodo",
      subscription: publicSubscription(existing),
    });
  }
  try {
    const fullName =
      typeof user!.user_metadata?.full_name === "string"
        ? user!.user_metadata.full_name
        : undefined;
    const session = await getDodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: parsed.data.agents }],
      customer: user!.email
        ? { email: user!.email, name: fullName ?? user!.email.split("@")[0] }
        : undefined,
      subscription_data: { trial_period_days: pricing.trialDays },
      metadata: {
        organization_id: organizationId!,
        user_id: user!.id,
        plan: "one",
        agents: String(parsed.data.agents),
        interval: parsed.data.interval,
      },
      return_url: `${publicAppUrl(request)}/app?billing=return`,
      cancel_url: `${publicAppUrl(request)}/app?billing=cancelled`,
      customization: { theme: "system" },
    });
    if (!session.checkout_url)
      throw new Error("Dodo Payments did not return a checkout URL.");
    return NextResponse.json({
      provider: "dodo",
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
      agents: parsed.data.agents,
    });
  } catch (error) {
    console.error("Dodo checkout creation failed", error);
    return NextResponse.json({ error: dodoError(error) }, { status: 502 });
  }
}

/**
 * Pulls an authoritative subscription from Dodo after the customer returns
 * from checkout, so the workspace activates even if the webhook is delayed.
 */
async function dodoSync(organization: Organization, subscriptionId: string) {
  const { user, organizationId } = organization;
  try {
    const subscription = await getDodo().subscriptions.retrieve(subscriptionId);
    const ownedByWorkspace =
      subscription.metadata?.organization_id === organizationId ||
      (!subscription.metadata?.organization_id &&
        subscription.customer.email?.toLowerCase() ===
          user!.email?.toLowerCase());
    if (!ownedByWorkspace)
      return NextResponse.json(
        { error: "This subscription belongs to a different workspace." },
        { status: 403 },
      );
    const admin = createAdminClient();
    await syncDodoSubscription(admin, {
      ...subscription,
      metadata: { ...subscription.metadata, organization_id: organizationId! },
    });
    return dodoGet();
  } catch (error) {
    console.error("Dodo subscription sync failed", error);
    return NextResponse.json({ error: dodoError(error) }, { status: 502 });
  }
}

export async function dodoPatch(request: Request) {
  const organization = await getCurrentOrganization();
  const denied = await authorize(organization);
  if (denied) return denied;
  const { supabase, organizationId } = organization;
  const parsed = agentsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  const requiredAgents = await requiredPaidSeats(supabase, organizationId!);
  if (parsed.data.agents < requiredAgents)
    return NextResponse.json(
      {
        error: `Remove paid teammates before reducing below ${requiredAgents} seats.`,
      },
      { status: 409 },
    );
  const config = dodoConfiguration();
  if (!config.productId)
    return NextResponse.json(
      { error: "Dodo Payments product is not configured." },
      { status: 503 },
    );
  try {
    const current = currentEnvironmentSubscription(
      await currentSubscription(supabase, organizationId!),
    );
    const id = current?.provider_subscription_id;
    if (!current || !id)
      return NextResponse.json(
        { error: "No Dodo Payments subscription is available." },
        { status: 404 },
      );
    if (!["active", "trialing"].includes(current.status ?? ""))
      return NextResponse.json(
        { error: "Resolve payment status before changing seats." },
        { status: 409 },
      );
    const result = await changeDodoSeats(
      id,
      Number(current.metadata?.agents ?? 1),
      parsed.data.agents,
      typeof current.metadata?.product_id === "string"
        ? current.metadata.product_id
        : null,
    );
    const metadata = {
      ...(current.metadata ?? {}),
      agents: result.scheduled
        ? Number(current.metadata?.agents ?? 1)
        : parsed.data.agents,
      pending_agents: result.scheduled ? parsed.data.agents : null,
      seat_change_scheduled: result.scheduled,
      seat_change_requested_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("subscriptions")
      .update({ metadata })
      .eq("organization_id", organizationId!)
      .eq("provider_subscription_id", id);
    if (error) throw error;
    return NextResponse.json({
      provider: "dodo",
      subscription: {
        ...publicSubscription({ ...current, metadata }),
        pendingAgents: result.scheduled ? parsed.data.agents : null,
      },
      chargedImmediately: !result.scheduled,
    });
  } catch (error) {
    console.error("Dodo seat change failed", error);
    return NextResponse.json({ error: dodoError(error) }, { status: 502 });
  }
}

export async function dodoDelete() {
  const organization = await getCurrentOrganization();
  const denied = await authorize(organization);
  if (denied) return denied;
  const { supabase, organizationId } = organization;
  try {
    const current = currentEnvironmentSubscription(
      await currentSubscription(supabase, organizationId!),
    );
    const id = current?.provider_subscription_id;
    if (!current || !id)
      return NextResponse.json(
        { error: "No Dodo Payments subscription is available." },
        { status: 404 },
      );
    if (current.metadata?.cancel_at_period_end)
      return NextResponse.json({
        provider: "dodo",
        subscription: publicSubscription(current),
      });
    const updated = await getDodo().subscriptions.update(id, {
      cancel_at_next_billing_date: true,
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
          updated.next_billing_date ?? current.current_period_end,
        metadata,
      })
      .eq("organization_id", organizationId!)
      .eq("provider_subscription_id", id);
    if (error) throw error;
    return NextResponse.json({
      provider: "dodo",
      subscription: publicSubscription({ ...current, metadata }),
    });
  } catch (error) {
    console.error("Dodo cancellation failed", error);
    return NextResponse.json({ error: dodoError(error) }, { status: 502 });
  }
}
