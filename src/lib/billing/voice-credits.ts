import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeUsageGuard } from "@/lib/billing/guards";
import {
  voiceIncluded,
  voiceLimits,
  voicePacks,
  type VoicePackId,
} from "@/lib/pricing";

type Subscription = Parameters<typeof voiceIncluded>[0];

export async function voiceBalance(
  admin: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await admin.rpc("voice_minutes_balance", {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Credits a paid pack once per payment, however many times it is reported. */
export async function creditVoicePack(
  admin: SupabaseClient,
  input: { organizationId: string; pack: VoicePackId; paymentId: string },
) {
  const pack = voicePacks.find((item) => item.id === input.pack);
  if (!pack) throw new Error("Unknown voice pack.");
  const { error } = await admin.from("voice_credit_ledger").insert({
    organization_id: input.organizationId,
    minutes: pack.minutes,
    kind: "purchase",
    reference: input.paymentId,
    metadata: { pack: pack.id, price_usd: pack.price },
  });
  if (error && error.code !== "23505") throw error;
  return { credited: !error, minutes: pack.minutes };
}

/**
 * Decides whether a new voice session or call may start. It needs an active
 * paid plan and a full-length call's worth of prepaid minutes, and at most
 * one call per prepaid 15 minutes may start in any 15-minute window, so
 * concurrent calls can never outrun the balance.
 */
export async function voiceStartCheck(
  admin: SupabaseClient,
  organizationId: string,
  subscription: Subscription,
) {
  if (!voiceIncluded(subscription))
    return {
      ok: false as const,
      error:
        "Voice runs on an active paid plan. Trials and scheduled cancellations are text-only.",
    };
  const balance = await voiceBalance(admin, organizationId);
  if (balance < voiceLimits.startMinimumMinutes)
    return {
      ok: false as const,
      error: `Voice needs at least ${voiceLimits.startMinimumMinutes} prepaid minutes. Buy a voice pack under Billing.`,
    };
  const concurrent = Math.floor(balance / voiceLimits.callCapMinutes);
  const allowed = await consumeUsageGuard(
    admin,
    `voice-start:${organizationId}`,
    concurrent,
    voiceLimits.callCapMinutes * 60,
  );
  if (!allowed)
    return {
      ok: false as const,
      error:
        "Your prepaid minutes are fully committed to calls in progress. Try again shortly or add a voice pack.",
    };
  return { ok: true as const, balance };
}

type CallRow = {
  id: string;
  organization_id: string;
  duration_seconds: number;
};

/** Deducts finished calls from prepaid minutes, rounded up per call. */
export async function settleVoiceUsage(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("calls")
    .select("id,organization_id,duration_seconds")
    .not("status", "in", "(queued,ringing,in_progress)")
    .gt("duration_seconds", 0)
    .is("billing_reported_at", null)
    .limit(500);
  if (error) throw error;
  const calls = (data ?? []) as CallRow[];
  for (const call of calls) {
    const minutes = Math.ceil(call.duration_seconds / 60);
    const { error: ledgerError } = await admin
      .from("voice_credit_ledger")
      .insert({
        organization_id: call.organization_id,
        minutes: -minutes,
        kind: "usage",
        reference: call.id,
        metadata: { duration_seconds: call.duration_seconds },
      });
    if (ledgerError && ledgerError.code !== "23505") throw ledgerError;
    const { error: markError } = await admin
      .from("calls")
      .update({ billing_reported_at: new Date().toISOString() })
      .eq("id", call.id);
    if (markError) throw markError;
  }
  return { settled: calls.length };
}
