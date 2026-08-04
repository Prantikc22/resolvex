import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment response" }, { status: 400 });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });

  const payload = `${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const valid = expected.length === parsed.data.razorpay_signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.data.razorpay_signature));
  if (!valid) return NextResponse.json({ error: "Payment signature mismatch" }, { status: 400 });
  return NextResponse.json({ verified: true });
}
