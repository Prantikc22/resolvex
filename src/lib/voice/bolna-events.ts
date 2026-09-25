import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHumanHandoff } from "@/lib/handoff";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function transcriptText(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return null;
  return value
    .map((turn) => {
      const row = record(turn);
      const message = text(row.message) ?? text(row.text) ?? text(row.content);
      return message ? `${text(row.role) ?? "speaker"}: ${message}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function callStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (["completed", "success"].includes(status)) return "completed";
  if (["queued", "created", "initiated"].includes(status)) return "queued";
  if (["ringing"].includes(status)) return "ringing";
  if (["in-progress", "in_progress", "processing", "started"].includes(status))
    return "in_progress";
  if (["no-answer", "no_answer", "busy"].includes(status)) return "missed";
  if (["canceled", "cancelled", "stopped"].includes(status)) return "abandoned";
  if (["failed", "error", "balance-low", "balance_low"].includes(status))
    return "failed";
  return "queued";
}

export async function reconcileBolnaExecution(
  admin: SupabaseClient,
  payload: JsonRecord,
) {
  const execution = record(payload.execution_id ? payload : payload.data);
  const executionId =
    text(execution.execution_id) ?? text(payload.execution_id);
  const agentId = text(execution.agent_id) ?? text(payload.agent_id);
  if (!executionId || !agentId)
    throw new Error("Telephone event is missing execution_id or agent_id.");
  const { data: providerAgent } = await admin
    .from("ai_provider_agents")
    .select("organization_id,ai_employee_id")
    .eq("provider", "bolna")
    .eq("external_agent_id", agentId)
    .single();
  if (!providerAgent) throw new Error("Unknown telephone agent.");

  const telephony = record(execution.telephony_data);
  const fromNumber =
    text(execution.agent_number) ??
    text(telephony.agent_number) ??
    text(telephony.from_number);
  const toNumber =
    text(execution.user_number) ??
    text(telephony.user_number) ??
    text(telephony.to_number);
  const direction =
    String(
      telephony.call_type ?? execution.call_type ?? "outbound",
    ).toLowerCase() === "inbound"
      ? "inbound"
      : "outbound";
  const durationSeconds = Math.max(
    0,
    Math.ceil(
      Number(execution.conversation_duration ?? execution.duration ?? 0),
    ),
  );
  const providerCost = Math.max(0, Number(execution.total_cost ?? 0));
  const costMinor = Math.ceil(providerCost * 100);
  const externalStatus = execution.status ?? payload.status;
  const status = callStatus(externalStatus);
  const transferDetected =
    String(execution.transcript ?? "")
      .toLowerCase()
      .includes("transfer") ||
    String(execution.outcome ?? "")
      .toLowerCase()
      .includes("transfer");
  const { data: phone } = fromNumber
    ? await admin
        .from("phone_numbers")
        .select("id")
        .eq("organization_id", providerAgent.organization_id)
        .in("e164", [fromNumber, `+${fromNumber.replace(/^\+/, "")}`])
        .maybeSingle()
    : { data: null };
  const { data: call, error } = await admin
    .from("calls")
    .upsert(
      {
        organization_id: providerAgent.organization_id,
        ai_employee_id: providerAgent.ai_employee_id,
        phone_number_id: phone?.id ?? null,
        provider: "bolna",
        external_call_id: executionId,
        direction,
        handler_type: transferDetected ? "mixed" : "ai",
        from_number: direction === "inbound" ? toNumber : fromNumber,
        to_number: direction === "inbound" ? fromNumber : toNumber,
        status:
          transferDetected && status === "completed" ? "transferred" : status,
        started_at:
          text(execution.started_at) ?? text(execution.created_at) ?? undefined,
        ended_at: [
          "completed",
          "missed",
          "failed",
          "abandoned",
          "transferred",
        ].includes(
          transferDetected && status === "completed" ? "transferred" : status,
        )
          ? (text(execution.updated_at) ?? new Date().toISOString())
          : null,
        duration_seconds: durationSeconds,
        summary: text(execution.summary),
        transcript: transcriptText(execution.transcript),
        recording_url:
          text(telephony.recording_url) ?? text(execution.recording_url),
        outcome: text(execution.outcome) ?? String(externalStatus ?? status),
        cost_minor: costMinor,
        currency: "USD",
        metadata: {
          bolna: execution,
          provider_cost: providerCost,
          cost_breakdown: execution.cost_breakdown ?? null,
          billing_basis: "Telephony provider reported execution total_cost",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,external_call_id" },
    )
    .select("id")
    .single();
  if (error) throw error;

  if (
    ["completed", "missed", "failed", "abandoned", "transferred"].includes(
      status,
    )
  ) {
    await admin.from("credit_transactions").upsert(
      {
        organization_id: providerAgent.organization_id,
        category: "telephony",
        amount_microunits: -durationSeconds,
        monetary_amount_minor: costMinor,
        currency: "USD",
        reference_type: "call",
        reference_id: call.id,
        idempotency_key: `bolna:${executionId}:final`,
        metadata: {
          duration_seconds: durationSeconds,
          provider_cost: providerCost,
          cost_breakdown: execution.cost_breakdown ?? null,
        },
      },
      { onConflict: "organization_id,idempotency_key" },
    );
  }
  if (transferDetected) {
    const callerNumber = direction === "inbound" ? fromNumber : toNumber;
    const externalId = `phone:${callerNumber ?? executionId}`;
    let { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", providerAgent.organization_id)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle();
    if (!contact) {
      const created = await admin
        .from("contacts")
        .insert({
          organization_id: providerAgent.organization_id,
          name: callerNumber || "Telephone caller",
          phone: callerNumber,
          external_id: externalId,
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      contact = created.data;
    }
    let { data: inbox } = await admin
      .from("inboxes")
      .select("id")
      .eq("organization_id", providerAgent.organization_id)
      .eq("channel", "api")
      .eq("name", "Telephone handoffs")
      .maybeSingle();
    if (!inbox) {
      const created = await admin
        .from("inboxes")
        .insert({
          organization_id: providerAgent.organization_id,
          name: "Telephone handoffs",
          channel: "api",
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      inbox = created.data;
    }
    let { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("organization_id", providerAgent.organization_id)
      .contains("metadata", { bolna_execution_id: executionId })
      .maybeSingle();
    if (!conversation) {
      const created = await admin
        .from("conversations")
        .insert({
          organization_id: providerAgent.organization_id,
          inbox_id: inbox.id,
          contact_id: contact.id,
          subject: `Telephone transfer · ${callerNumber || "caller"}`,
          metadata: {
            source: "managed_telephone",
            bolna_execution_id: executionId,
            ai_employee_id: providerAgent.ai_employee_id,
            call_id: call.id,
          },
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      conversation = created.data;
    }
    await createHumanHandoff({
      supabase: admin,
      organizationId: providerAgent.organization_id,
      conversationId: conversation.id,
      employeeId: providerAgent.ai_employee_id,
      source: "telephone",
      reason: "Telephone caller requested or triggered a live transfer",
      summary: text(execution.summary) ?? transcriptText(execution.transcript),
      callbackPhone: callerNumber,
    });
  }
  return {
    callId: call.id,
    organizationId: providerAgent.organization_id,
    status,
    terminal: [
      "completed",
      "missed",
      "failed",
      "abandoned",
      "transferred",
    ].includes(status),
  };
}
