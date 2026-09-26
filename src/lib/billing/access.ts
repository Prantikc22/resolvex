import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dodoConfiguration } from "@/lib/billing/provider";

export const WORKSPACE_ACCESS_STATUSES = new Set([
  "authenticated",
  "trialing",
  "active",
  "pending",
  "past_due",
]);

type AccessSubscription = {
  status?: string | null;
  provider?: string | null;
  current_period_end?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function subscriptionHasWorkspaceAccess(
  subscription: AccessSubscription | null | undefined,
  now = Date.now(),
) {
  if (!WORKSPACE_ACCESS_STATUSES.has(subscription?.status ?? "")) return false;
  // Complimentary workspaces (the founder's own, partners) are never billed.
  if (subscription?.provider === "complimentary")
    return subscription.status === "active";
  if (subscription?.provider === "dodo") {
    // Test-mode subscriptions never unlock a live-mode deployment.
    return (
      subscription.metadata?.dodo_environment ===
      dodoConfiguration().environment
    );
  }
  if (subscription?.provider === "paddle") {
    // Legacy Paddle sandbox subscriptions no longer receive webhooks. Honour
    // them until their paid period ends so existing workspaces can move to
    // Dodo Payments without an interruption.
    const end = subscription.current_period_end
      ? new Date(subscription.current_period_end).getTime()
      : Number.NaN;
    return Number.isFinite(end) && end > now;
  }
  return true;
}

export async function hasWorkspaceAccess(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,provider,current_period_end,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return subscriptionHasWorkspaceAccess(data);
}
