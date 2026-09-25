import { NextResponse } from "next/server";
import { verifyElevenLabsWebhook } from "@/lib/providers/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function transcriptText(value: unknown) {
  if (!Array.isArray(value)) return text(value);
  return value
    .map((turn) => {
      const row = record(turn);
      const message = text(row.message) ?? text(row.text);
      return message ? `${text(row.role) ?? "speaker"}: ${message}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function transferred(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.some((turn) => {
    const serialized = JSON.stringify(turn).toLowerCase();
    return (
      serialized.includes("transfer_to_number") ||
      serialized.includes("transfer_to_agent") ||
      serialized.includes("sip_refer")
    );
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (
    !verifyElevenLabsWebhook({
      body: raw,
      signature: request.headers.get("elevenlabs-signature"),
    })
  )
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let payload: UnknownRecord;
  try {
    payload = record(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const data = record(payload.data);
  const eventType = text(payload.type) ?? "unknown";
  const conversationId =
    text(data.conversation_id) ?? text(payload.conversation_id);
  const agentId = text(data.agent_id) ?? text(payload.agent_id);
  if (!conversationId || !agentId)
    return NextResponse.json(
      { error: "Missing event identity." },
      { status: 400 },
    );

  const admin = createAdminClient();
  const eventId = text(payload.event_id) ?? `${eventType}:${conversationId}`;
  const { data: existing } = await admin
    .from("provider_events")
    .select("id,processed_at")
    .eq("provider", "elevenlabs")
    .eq("external_event_id", eventId)
    .maybeSingle();
  if (existing?.processed_at)
    return NextResponse.json({ received: true, duplicate: true });
  await admin.from("provider_events").upsert(
    {
      provider: "elevenlabs",
      external_event_id: eventId,
      event_type: eventType,
      payload,
    },
    { onConflict: "provider,external_event_id" },
  );

  try {
    const { data: providerAgent } = await admin
      .from("ai_provider_agents")
      .select("organization_id,ai_employee_id")
      .eq("provider", "elevenlabs")
      .eq("external_agent_id", agentId)
      .maybeSingle();
    const { data: legacyEmployee } = providerAgent
      ? { data: null }
      : await admin
          .from("ai_employees")
          .select("id,organization_id")
          .eq("provider", "elevenlabs")
          .eq("external_agent_id", agentId)
          .maybeSingle();
    const employee = providerAgent
      ? {
          id: providerAgent.ai_employee_id,
          organization_id: providerAgent.organization_id,
        }
      : legacyEmployee;
    if (!employee) throw new Error("Unknown ElevenLabs agent.");

    const metadata = record(data.metadata);
    const phoneCall = record(metadata.phone_call);
    const providerBody = record(metadata.body);
    const initiation = record(data.conversation_initiation_client_data);
    const dynamicVariables = record(
      initiation.dynamic_variables ?? metadata.dynamic_variables,
    );
    const widgetSession = text(dynamicVariables.resolvex_widget_session);
    const analysis = record(data.analysis);
    const providerCredits = Math.max(0, Number(metadata.cost ?? 0));
    const durationSeconds = Math.max(
      0,
      Number(metadata.call_duration_secs ?? data.call_duration_secs ?? 0),
    );
    const costMinor = Math.max(0, Math.ceil((durationSeconds / 60) * 2));
    const failed = eventType === "call_initiation_failure";
    const transferSuccessful =
      !failed &&
      analysis.call_successful === "success" &&
      transferred(data.transcript);
    const agentNumber =
      text(phoneCall.agent_number) ??
      text(providerBody.from_number) ??
      text(data.from_number);
    const { data: phone } = agentNumber
      ? await admin
          .from("phone_numbers")
          .select("id")
          .eq("organization_id", employee.organization_id)
          .in("e164", [agentNumber, agentNumber.replace(/^\+/, "")])
          .maybeSingle()
      : { data: null };
    const { data: call, error } = await admin
      .from("calls")
      .upsert(
        {
          organization_id: employee.organization_id,
          ai_employee_id: employee.id,
          phone_number_id: phone?.id ?? null,
          provider: "elevenlabs",
          external_call_id: conversationId,
          direction:
            text(phoneCall.direction) === "outbound" ||
            eventType === "call_initiation_failure"
              ? "outbound"
              : "inbound",
          handler_type: transferSuccessful ? "mixed" : "ai",
          from_number:
            text(phoneCall.external_number) ??
            text(providerBody.from_number) ??
            text(data.from_number),
          to_number:
            text(phoneCall.agent_number) ??
            text(providerBody.to_number) ??
            text(data.to_number),
          status: failed
            ? "failed"
            : transferSuccessful
              ? "transferred"
              : "completed",
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          summary:
            text(analysis.transcript_summary) ??
            text(data.failure_reason) ??
            text(data.summary) ??
            null,
          transcript: transcriptText(data.transcript),
          outcome:
            text(analysis.call_successful) ?? (failed ? "failed" : "completed"),
          cost_minor: costMinor,
          currency: "USD",
          metadata: {
            elevenlabs: data,
            event_type: eventType,
            provider_credits: providerCredits,
            billing_basis: "ResolveX voice $0.12/minute",
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider,external_call_id" },
      )
      .select("id")
      .single();
    if (error) throw error;

    await admin.from("credit_transactions").upsert(
      {
        organization_id: employee.organization_id,
        category: "voice",
        amount_microunits: -durationSeconds,
        monetary_amount_minor: costMinor,
        currency: "USD",
        reference_type: "call",
        reference_id: call.id,
        idempotency_key: `elevenlabs:${conversationId}:final`,
        metadata: {
          duration_seconds: durationSeconds,
          event_type: eventType,
          provider_credits: providerCredits,
          rate_minor_per_minute: 2,
        },
      },
      { onConflict: "organization_id,idempotency_key" },
    );
    if (widgetSession) {
      const { data: widgetConversation } = await admin
        .from("conversations")
        .select("id")
        .eq("organization_id", employee.organization_id)
        .contains("metadata", { widget_session: widgetSession })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (widgetConversation) {
        const summary =
          text(analysis.transcript_summary) ??
          (failed
            ? text(data.failure_reason)
            : "Website voice session completed");
        await Promise.all([
          admin
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              metadata: {
                widget_session: widgetSession,
                source: "website_voice",
                ai_employee_id: employee.id,
                elevenlabs_conversation_id: conversationId,
              },
            })
            .eq("id", widgetConversation.id),
          admin.from("messages").insert({
            organization_id: employee.organization_id,
            conversation_id: widgetConversation.id,
            sender_type: "system",
            body: summary || "Website voice session completed",
            is_internal: true,
            ai_metadata: {
              provider: "elevenlabs",
              external_conversation_id: conversationId,
              transcript: transcriptText(data.transcript),
            },
          }),
        ]);
      }
    }
    await admin
      .from("provider_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("provider", "elevenlabs")
      .eq("external_event_id", eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Processing failed.";
    await admin
      .from("provider_events")
      .update({ error: message })
      .eq("provider", "elevenlabs")
      .eq("external_event_id", eventId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
