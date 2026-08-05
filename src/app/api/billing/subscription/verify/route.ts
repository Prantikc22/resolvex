import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const bodySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

function safeMatch(expected: string, received: string) {
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 409 },
    );
  }
  if (membershipRole !== "owner" && membershipRole !== "admin") {
    return NextResponse.json(
      { error: "Only workspace owners and admins can manage billing." },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription response." },
      { status: 400 },
    );
  }
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Razorpay is not configured." },
      { status: 503 },
    );
  }

  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (readError || !subscription) {
    return NextResponse.json(
      { error: "Subscription record was not found." },
      { status: 404 },
    );
  }
  if (
    subscription.provider_subscription_id !==
    parsed.data.razorpay_subscription_id
  ) {
    return NextResponse.json(
      { error: "Subscription does not belong to this workspace." },
      { status: 400 },
    );
  }

  const expected = createHmac("sha256", secret)
    .update(
      `${parsed.data.razorpay_payment_id}|${subscription.provider_subscription_id}`,
    )
    .digest("hex");
  if (!safeMatch(expected, parsed.data.razorpay_signature)) {
    return NextResponse.json(
      { error: "Subscription signature mismatch." },
      { status: 400 },
    );
  }

  const metadata = (subscription.metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "authenticated",
      metadata: {
        ...metadata,
        razorpay_payment_id: parsed.data.razorpay_payment_id,
        checkout_verified_at: new Date().toISOString(),
      },
    })
    .eq("organization_id", organizationId);
  if (error) {
    return NextResponse.json(
      { error: "Payment was verified but the workspace could not be updated." },
      { status: 500 },
    );
  }

  return NextResponse.json({ verified: true, status: "authenticated" });
}
