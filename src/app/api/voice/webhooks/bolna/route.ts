import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileBolnaExecution } from "@/lib/voice/bolna-events";

function validToken(provided: string | null) {
  const secret = process.env.BOLNA_WEBHOOK_SECRET;
  if (!secret || !provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!validToken(provided))
    return NextResponse.json(
      { error: "Invalid webhook token." },
      { status: 401 },
    );
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const executionId = String(
    payload.execution_id ??
      (payload.data as Record<string, unknown> | undefined)?.execution_id ??
      "",
  );
  if (!executionId)
    return NextResponse.json(
      { error: "Missing execution ID." },
      { status: 400 },
    );
  const eventType = String(
    payload.status ?? payload.event ?? "execution.updated",
  );
  const eventId = String(payload.event_id ?? `${executionId}:${eventType}`);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("provider_events")
    .select("processed_at")
    .eq("provider", "bolna")
    .eq("external_event_id", eventId)
    .maybeSingle();
  if (existing?.processed_at)
    return NextResponse.json({ received: true, duplicate: true });
  await admin.from("provider_events").upsert(
    {
      provider: "bolna",
      external_event_id: eventId,
      event_type: eventType,
      payload,
    },
    { onConflict: "provider,external_event_id" },
  );
  try {
    const result = await reconcileBolnaExecution(admin, payload);
    await admin
      .from("provider_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("provider", "bolna")
      .eq("external_event_id", eventId);
    return NextResponse.json({ received: true, callId: result.callId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Processing failed.";
    await admin
      .from("provider_events")
      .update({ error: message })
      .eq("provider", "bolna")
      .eq("external_event_id", eventId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
