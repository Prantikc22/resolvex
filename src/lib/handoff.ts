import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function createHumanHandoff(input: {
  supabase: SupabaseClient;
  organizationId: string;
  conversationId: string;
  employeeId?: string | null;
  source:
    "website_chat" | "website_voice" | "telephone" | "email" | "automation";
  reason: string;
  summary?: string | null;
  requestedContact?: Record<string, unknown>;
  callbackPhone?: string | null;
}) {
  const { data: existing } = await input.supabase
    .from("human_handoffs")
    .select("id,status,created_at")
    .eq("organization_id", input.organizationId)
    .eq("conversation_id", input.conversationId)
    .in("status", ["waiting", "assigned", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { handoff: existing, duplicate: true };
  const { data: handoff, error } = await input.supabase
    .from("human_handoffs")
    .insert({
      organization_id: input.organizationId,
      conversation_id: input.conversationId,
      ai_employee_id: input.employeeId ?? null,
      source: input.source,
      reason: input.reason,
      summary: input.summary ?? null,
      requested_contact: input.requestedContact ?? {},
    })
    .select("id,status,created_at")
    .single();
  if (error) throw error;
  await Promise.all([
    input.supabase
      .from("conversations")
      .update({
        status: "pending",
        priority: "high",
        ai_state: "handed_off",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", input.conversationId)
      .eq("organization_id", input.organizationId),
    input.supabase.from("messages").insert({
      organization_id: input.organizationId,
      conversation_id: input.conversationId,
      sender_type: "system",
      body: `Human handoff requested: ${input.reason}`,
      is_internal: true,
      ai_metadata: { handoff_id: handoff.id, source: input.source },
    }),
    input.supabase.from("audit_events").insert({
      organization_id: input.organizationId,
      action: "handoff.requested",
      entity_type: "conversation",
      entity_id: input.conversationId,
      metadata: {
        handoff_id: handoff.id,
        source: input.source,
        reason: input.reason,
      },
    }),
  ]);
  if (input.callbackPhone) {
    await input.supabase.from("callback_requests").insert({
      organization_id: input.organizationId,
      handoff_id: handoff.id,
      conversation_id: input.conversationId,
      phone_number: input.callbackPhone,
    });
  }
  return { handoff, duplicate: false };
}
