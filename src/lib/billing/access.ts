import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { paddleConfiguration } from "@/lib/billing/provider";

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
  metadata?: Record<string, unknown> | null;
};

export function subscriptionHasWorkspaceAccess(
  subscription: AccessSubscription | null | undefined,
) {
  if (!WORKSPACE_ACCESS_STATUSES.has(subscription?.status ?? "")) return false;
  if (subscription?.provider !== "paddle") return true;
  const configuredEnvironment = paddleConfiguration().environment;
  const storedEnvironment = subscription.metadata?.paddle_environment;
  // Records created before environment tagging were sandbox-only.
  return (
    storedEnvironment === configuredEnvironment ||
    (storedEnvironment == null && configuredEnvironment === "sandbox")
  );
}

export async function hasWorkspaceAccess(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,provider,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return subscriptionHasWorkspaceAccess(data);
}
