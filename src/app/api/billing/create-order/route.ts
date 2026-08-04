import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({ agents: z.number().int().min(1).max(500) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid agent count" }, { status: 400 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay keys are not configured yet." }, { status: 503 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const amount = parsed.data.agents * 15 * 100;
  const order = await razorpay.orders.create({
    amount,
    currency: "USD",
    receipt: `resolvex_${Date.now()}`,
    notes: { plan: "one", agents: parsed.data.agents.toString(), user_id: user.id },
  });

  return NextResponse.json({ order, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keyId });
}
