import Razorpay from "razorpay";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAID_ROLES = new Set(["owner", "admin", "agent"]);

export async function requiredPaidSeats(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const [
    { data: members, error: memberError },
    { data: invites, error: inviteError },
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", organizationId),
    supabase
      .from("invitations")
      .select("role")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  if (memberError) throw memberError;
  if (inviteError) throw inviteError;
  return Math.max(
    1,
    (members ?? []).filter((row) => PAID_ROLES.has(row.role)).length +
      (invites ?? []).filter((row) => PAID_ROLES.has(row.role)).length,
  );
}

export async function syncSubscriptionSeats(
  supabase: SupabaseClient,
  organizationId: string,
  seats: number,
) {
  const { data: row, error } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id,status,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!row || !["active", "authenticated"].includes(row.status)) {
    return { synced: false, reason: "inactive" as const };
  }
  const current = Number(row.metadata?.agents ?? 1);
  if (current === seats) return { synced: true, changed: false };

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (
    !keyId ||
    !keySecret ||
    !row.provider_subscription_id?.startsWith("sub_")
  ) {
    throw new Error("Razorpay subscription settings are incomplete.");
  }
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const increasing = seats > current;
  await razorpay.subscriptions.update(row.provider_subscription_id, {
    quantity: seats,
    schedule_change_at: increasing ? "now" : "cycle_end",
    customer_notify: true,
  });
  const metadata = row.metadata ?? {};
  const nextMetadata = increasing
    ? {
        ...metadata,
        agents: seats,
        pending_agents: null,
        seat_change_scheduled: false,
      }
    : { ...metadata, pending_agents: seats, seat_change_scheduled: true };
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ metadata: nextMetadata })
    .eq("organization_id", organizationId);
  if (updateError) throw updateError;
  return { synced: true, changed: true, scheduled: !increasing };
}
