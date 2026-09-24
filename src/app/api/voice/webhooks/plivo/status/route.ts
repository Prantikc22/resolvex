import { NextResponse } from "next/server";
import { publicAppUrl } from "@/lib/app-url";
import {
  retrievePlivoCall,
  verifyPlivoV3Signature,
} from "@/lib/providers/plivo";
import { createAdminClient } from "@/lib/supabase/admin";

const terminal = new Set([
  "completed",
  "failed",
  "busy",
  "no-answer",
  "timeout",
]);

function callStatus(value: string) {
  if (value === "completed") return "completed";
  if (["ringing", "queued"].includes(value)) return value;
  if (["in-progress", "answered"].includes(value)) return "in_progress";
  if (["no-answer", "busy", "timeout"].includes(value)) return "missed";
  return "failed";
}

export async function POST(request: Request) {
  const raw = await request.text();
  const parsed = new URLSearchParams(raw);
  const params = Object.fromEntries(parsed.entries());
  const requestUrl = new URL(request.url);
  const valid = verifyPlivoV3Signature({
    url: `${publicAppUrl()}${requestUrl.pathname}${requestUrl.search}`,
    params,
    signature: request.headers.get("x-plivo-signature-v3"),
    nonce: request.headers.get("x-plivo-signature-v3-nonce"),
  });
  if (!valid)
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const phoneId = requestUrl.searchParams.get("phone");
  const callId = params.CallUUID ?? params.RequestUUID;
  if (!phoneId || !callId)
    return NextResponse.json(
      { error: "Missing call identity." },
      { status: 400 },
    );
  const admin = createAdminClient();
  const { data: phone } = await admin
    .from("phone_numbers")
    .select("id,organization_id,assigned_employee_ids,currency")
    .eq("id", phoneId)
    .single();
  if (!phone)
    return NextResponse.json(
      { error: "Unknown phone number." },
      { status: 404 },
    );

  const providerStatus = params.CallStatus ?? params.DialStatus ?? "failed";
  const ended = terminal.has(providerStatus);
  const cdr = ended ? await retrievePlivoCall(callId).catch(() => null) : null;
  const durationSeconds = Math.max(
    0,
    Number(cdr?.bill_duration ?? params.BillDuration ?? params.Duration ?? 0),
  );
  const costMinor = Math.max(
    0,
    Math.round(
      Number(cdr?.total_amount ?? params.TotalCost ?? params.TotalRate ?? 0) *
        100,
    ),
  );
  const payload = {
    organization_id: phone.organization_id,
    ai_employee_id: phone.assigned_employee_ids?.[0] ?? null,
    phone_number_id: phone.id,
    provider: "plivo",
    external_call_id: callId,
    direction:
      (cdr?.call_direction ?? params.Direction) === "outbound"
        ? "outbound"
        : "inbound",
    handler_type: "ai",
    from_number: cdr?.from_number ?? params.From ?? null,
    to_number: cdr?.to_number ?? params.To ?? null,
    status: callStatus(providerStatus),
    started_at:
      cdr?.answer_time ?? cdr?.initiation_time ?? params.StartTime ?? null,
    ended_at: ended
      ? (cdr?.end_time ?? params.EndTime ?? new Date().toISOString())
      : null,
    duration_seconds: durationSeconds,
    cost_minor: costMinor,
    currency: phone.currency ?? "USD",
    metadata: { provider_status: providerStatus, plivo: params, cdr },
    updated_at: new Date().toISOString(),
  };
  const { data: call, error } = await admin
    .from("calls")
    .upsert(payload, { onConflict: "provider,external_call_id" })
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (ended) {
    await admin.from("credit_transactions").upsert(
      {
        organization_id: phone.organization_id,
        category: "telephony",
        amount_microunits: -durationSeconds,
        monetary_amount_minor: costMinor,
        currency: phone.currency ?? "USD",
        reference_type: "call",
        reference_id: call.id,
        idempotency_key: `plivo:${callId}:final`,
        metadata: { duration_seconds: durationSeconds },
      },
      { onConflict: "organization_id,idempotency_key" },
    );
  }
  return NextResponse.json({ received: true });
}
