import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as { event?: string; payload?: { subscription?: { entity?: { id?: string; status?: string; notes?: { organization_id?: string } } } } };
  const entity = event.payload?.subscription?.entity;
  if (entity?.notes?.organization_id && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await admin.from("subscriptions").upsert({
      organization_id: entity.notes.organization_id,
      provider: "razorpay",
      provider_subscription_id: entity.id,
      status: entity.status ?? event.event ?? "updated",
      plan: "scale",
      metadata: { last_event: event.event },
    }, { onConflict: "organization_id" });
  }
  return NextResponse.json({ received: true });
}
