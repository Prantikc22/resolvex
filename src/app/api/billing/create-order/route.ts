import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const requestSchema = z.object({ agents: z.number().int().min(1).max(500) });

export async function POST(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Complete workspace setup before checkout" },
      { status: 409 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent count" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay keys are not configured yet." },
      { status: 503 },
    );
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const amount = parsed.data.agents * 15 * 100;
  const order = await razorpay.orders.create({
    amount,
    currency: "USD",
    receipt: `resolvex_${Date.now()}`,
    notes: {
      plan: "one",
      agents: parsed.data.agents.toString(),
      user_id: user.id,
      organization_id: organizationId,
    },
  });

  const { error } = await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      provider: "razorpay",
      provider_subscription_id: order.id,
      status: "created",
      plan: "one",
      metadata: {
        razorpay_order_id: order.id,
        amount,
        currency: "USD",
        agents: parsed.data.agents,
      },
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    return NextResponse.json(
      {
        error:
          "The order was created but could not be attached to the workspace",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    order,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keyId,
  });
}
