import type { SupabaseClient } from "@supabase/supabase-js";

export const WORKSPACE_ACCESS_STATUSES = new Set([
  "authenticated",
  "trialing",
  "active",
  "pending",
  "past_due",
]);

export async function hasWorkspaceAccess(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return WORKSPACE_ACCESS_STATUSES.has(data?.status ?? "");
}
