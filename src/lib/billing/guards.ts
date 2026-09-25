import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { subscriptionSeats, usageGuards } from "@/lib/pricing";

/**
 * Atomically counts one unit against a fixed window and reports whether it
 * fits. Fails closed: if the counter cannot be read, the paid call is skipped.
 */
export async function consumeUsageGuard(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await admin.rpc("consume_usage_guard", {
    p_key: key,
    p_limit: Math.max(0, Math.floor(limit)),
    p_window_seconds: Math.max(1, Math.floor(windowSeconds)),
  });
  if (error) {
    console.error("Usage guard unavailable", key, error.message);
    return false;
  }
  return data === true;
}

export function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Every paid action an employee takes (an LLM run or an app tool call) counts
 * against a monthly per-seat ceiling, and none run without an active plan.
 */
export async function reserveEmployeeAction(
  admin: SupabaseClient,
  organizationId: string,
) {
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("status,provider,current_period_end,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!subscriptionHasWorkspaceAccess(subscription))
    throw new Error("The workspace subscription is not active.");
  const allowed = await consumeUsageGuard(
    admin,
    `employee-actions:${organizationId}`,
    usageGuards.employeeActionsPerSeatPerMonth *
      subscriptionSeats(subscription),
    31 * 86_400,
  );
  if (!allowed)
    throw new Error(
      "This workspace reached its monthly AI employee action limit. Add seats to raise it.",
    );
}
