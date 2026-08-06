import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { pricing } from "@/lib/pricing";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { requiredPaidSeats } from "@/lib/billing/seats";

const agentsSchema = z.object({ agents: z.number().int().min(1).max(500) });
const activeStatuses = new Set([
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
]);

type StoredSubscription = {
  provider_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown> | null;
};

function configuration() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;
  return {
    configured: Boolean(keyId && keySecret && planId),
    keyId,
    keySecret,
    planId,
  };
}

function publicSubscription(row: StoredSubscription | null) {
  const metadata = row?.metadata ?? {};
  return row
    ? {
        id: row.provider_subscription_id,
        plan: row.plan,
        status: row.status,
        agents: Number(metadata.agents ?? 1),
        pendingAgents:
          metadata.pending_agents == null
            ? null
            : Number(metadata.pending_agents),
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: Boolean(metadata.cancel_at_period_end),
        shortUrl:
          typeof metadata.short_url === "string" ? metadata.short_url : null,
      }
    : null;
}

function provider() {
  const config = configuration();
  if (!config.configured || !config.keyId || !config.keySecret) return null;
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

function canManageBilling(role: string | null) {
  return role === "owner" || role === "admin";
}

function providerError(error: unknown) {
  const message =
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "description" in error.error &&
    typeof error.error.description === "string"
      ? error.error.description
      : null;
  return message ?? "Razorpay could not complete the subscription request.";
}

async function currentSubscription(
  supabase: Awaited<ReturnType<typeof getCurrentOrganization>>["supabase"],
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id,plan,status,current_period_end,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data as StoredSubscription | null;
}

async function currentUsage(
  supabase: Awaited<ReturnType<typeof getCurrentOrganization>>["supabase"],
  organizationId: string,
  subscription: StoredSubscription | null,
) {
  const metadata = subscription?.metadata ?? {};
  const storedStart = metadata.period_start ?? metadata.trial_start;
  const storedPeriodStart =
    typeof storedStart === "number"
      ? new Date(storedStart * 1000)
      : typeof storedStart === "string"
        ? new Date(storedStart)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodStart =
    Number.isNaN(storedPeriodStart.getTime()) || storedPeriodStart > new Date()
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : storedPeriodStart;
  const { data, error } = await supabase
    .from("usage_events")
    .select("event_type,quantity")
    .eq("organization_id", organizationId)
    .in("event_type", ["ai_resolution", "ai_allowance"])
    .gte("created_at", periodStart.toISOString());
  if (error) throw error;
  const resolutions = (data ?? [])
    .filter((event) => event.event_type === "ai_resolution")
    .reduce((total, event) => total + Number(event.quantity ?? 0), 0);
  const allowanceUsed = (data ?? [])
    .filter((event) => event.event_type === "ai_allowance")
    .reduce((total, event) => total + Number(event.quantity ?? 0), 0);
  return {
    resolutions,
    includedResolutions: pricing.includedResolutions,
    allowanceUsed,
    allowanceRemaining: Math.max(
      0,
      pricing.includedResolutions - allowanceUsed,
    ),
    billableResolutions: 0,
    estimatedOverage: 0,
    periodStart: periodStart.toISOString(),
  };
}

export async function GET() {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Complete workspace setup before managing billing." },
      { status: 409 },
    );
  }
  if (!canManageBilling(membershipRole)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can manage billing." },
      { status: 403 },
    );
  }

  try {
    const row = await currentSubscription(supabase, organizationId);
    const usage = await currentUsage(supabase, organizationId, row);
    const requiredAgents = await requiredPaidSeats(supabase, organizationId);
    return NextResponse.json({
      configured: configuration().configured,
      subscription: publicSubscription(row),
      requiredAgents,
      usage,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load subscription." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Complete workspace setup before checkout." },
      { status: 409 },
    );
  }
  if (!canManageBilling(membershipRole)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can manage billing." },
      { status: 403 },
    );
  }

  const parsed = agentsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  }
  const requiredAgents = await requiredPaidSeats(supabase, organizationId);
  if (parsed.data.agents < requiredAgents) {
    return NextResponse.json(
      {
        error: `This workspace currently requires ${requiredAgents} paid seats.`,
      },
      { status: 409 },
    );
  }

  const config = configuration();
  const razorpay = provider();
  if (!razorpay || !config.planId || !config.keyId) {
    return NextResponse.json(
      { error: "Add the Razorpay Plan ID before starting subscriptions." },
      { status: 503 },
    );
  }

  try {
    const existing = await currentSubscription(supabase, organizationId);
    if (
      existing?.provider_subscription_id?.startsWith("sub_") &&
      activeStatuses.has(existing.status ?? "")
    ) {
      return NextResponse.json({
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? config.keyId,
        reused: true,
        subscription: publicSubscription(existing),
      });
    }

    const trialStart =
      Math.floor(Date.now() / 1000) + pricing.trialDays * 86400;
    const subscription = await razorpay.subscriptions.create({
      plan_id: config.planId,
      total_count: 120,
      quantity: parsed.data.agents,
      customer_notify: true,
      start_at: trialStart,
      notes: {
        plan: "one",
        agents: parsed.data.agents,
        user_id: user.id,
        organization_id: organizationId,
      },
    });

    const currentPeriodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000).toISOString()
      : null;
    const { error } = await supabase.from("subscriptions").upsert(
      {
        organization_id: organizationId,
        provider: "razorpay",
        provider_customer_id: subscription.customer_id,
        provider_subscription_id: subscription.id,
        status: subscription.status,
        plan: "one",
        current_period_end: currentPeriodEnd,
        metadata: {
          agents: parsed.data.agents,
          short_url: subscription.short_url,
          trial_start: trialStart,
          cancel_at_period_end: false,
        },
      },
      { onConflict: "organization_id" },
    );
    if (error) {
      return NextResponse.json(
        {
          error:
            "The subscription was created but could not be attached to the workspace. Contact support before retrying.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? config.keyId,
      customer: {
        email: user.email ?? "",
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "",
      },
      subscription: publicSubscription({
        provider_subscription_id: subscription.id,
        plan: "one",
        status: subscription.status,
        current_period_end: currentPeriodEnd,
        metadata: {
          agents: parsed.data.agents,
          short_url: subscription.short_url,
          trial_start: trialStart,
          cancel_at_period_end: false,
        },
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: providerError(error) }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 409 },
    );
  }
  if (!canManageBilling(membershipRole)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can manage billing." },
      { status: 403 },
    );
  }
  const parsed = agentsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid agent count." },
      { status: 400 },
    );
  }
  const requiredAgents = await requiredPaidSeats(supabase, organizationId);
  if (parsed.data.agents < requiredAgents) {
    return NextResponse.json(
      {
        error: `Remove or convert paid teammates before reducing below ${requiredAgents} seats.`,
      },
      { status: 409 },
    );
  }
  const razorpay = provider();
  if (!razorpay) {
    return NextResponse.json(
      { error: "Razorpay subscription settings are incomplete." },
      { status: 503 },
    );
  }

  try {
    const current = await currentSubscription(supabase, organizationId);
    const subscriptionId = current?.provider_subscription_id;
    if (!current || !subscriptionId?.startsWith("sub_")) {
      return NextResponse.json(
        { error: "No subscription is available to update." },
        { status: 404 },
      );
    }
    if (!new Set(["authenticated", "active"]).has(current.status ?? "")) {
      return NextResponse.json(
        { error: "Seats can be changed after the subscription is active." },
        { status: 409 },
      );
    }

    const currentAgents = Number(current.metadata?.agents ?? 1);
    const increasing = parsed.data.agents > currentAgents;
    const updated = await razorpay.subscriptions.update(subscriptionId, {
      quantity: parsed.data.agents,
      schedule_change_at: increasing ? "now" : "cycle_end",
      customer_notify: true,
    });
    const metadata = current.metadata ?? {};
    const { error } = await supabase
      .from("subscriptions")
      .update({
        metadata: increasing
          ? {
              ...metadata,
              agents: parsed.data.agents,
              pending_agents: null,
              seat_change_scheduled: false,
            }
          : {
              ...metadata,
              pending_agents: parsed.data.agents,
              seat_change_scheduled: true,
            },
      })
      .eq("organization_id", organizationId);
    if (error) throw error;

    return NextResponse.json({
      subscription: {
        ...publicSubscription(current),
        agents: increasing ? parsed.data.agents : currentAgents,
        pendingAgents: increasing ? null : parsed.data.agents,
        status: updated.status,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: providerError(error) }, { status: 502 });
  }
}

export async function DELETE() {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 409 },
    );
  }
  if (!canManageBilling(membershipRole)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can manage billing." },
      { status: 403 },
    );
  }
  const razorpay = provider();
  if (!razorpay) {
    return NextResponse.json(
      { error: "Razorpay subscription settings are incomplete." },
      { status: 503 },
    );
  }

  try {
    const current = await currentSubscription(supabase, organizationId);
    const subscriptionId = current?.provider_subscription_id;
    if (!current || !subscriptionId?.startsWith("sub_")) {
      return NextResponse.json(
        { error: "No subscription is available to cancel." },
        { status: 404 },
      );
    }
    if (current.metadata?.cancel_at_period_end) {
      return NextResponse.json({ subscription: publicSubscription(current) });
    }

    const cancelled = await razorpay.subscriptions.cancel(subscriptionId, true);
    const metadata = current.metadata ?? {};
    const periodEnd = cancelled.current_end
      ? new Date(cancelled.current_end * 1000).toISOString()
      : current.current_period_end;
    const { error } = await supabase
      .from("subscriptions")
      .update({
        current_period_end: periodEnd,
        metadata: {
          ...metadata,
          cancel_at_period_end: true,
          cancellation_requested_at: new Date().toISOString(),
        },
      })
      .eq("organization_id", organizationId);
    if (error) throw error;

    return NextResponse.json({
      subscription: publicSubscription({
        ...current,
        status: cancelled.status,
        current_period_end: periodEnd,
        metadata: { ...metadata, cancel_at_period_end: true },
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: providerError(error) }, { status: 502 });
  }
}
