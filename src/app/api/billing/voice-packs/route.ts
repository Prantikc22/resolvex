import { NextResponse } from "next/server";
import { z } from "zod";
import { publicAppUrl } from "@/lib/app-url";
import { getDodo } from "@/lib/billing/dodo";
import { dodoConfiguration } from "@/lib/billing/provider";
import { creditVoicePack, voiceBalance } from "@/lib/billing/voice-credits";
import { voiceIncluded, voiceLimits, voicePacks } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const buySchema = z.object({
  pack: z.enum(voicePacks.map((pack) => pack.id) as [string, ...string[]]),
});
const syncSchema = z.object({ paymentId: z.string().min(4).max(80) });

async function context() {
  const organization = await getCurrentOrganization();
  const { user, organizationId, membershipRole } = organization;
  if (!user || !organizationId)
    return {
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  if (membershipRole !== "owner" && membershipRole !== "admin")
    return {
      denied: NextResponse.json(
        { error: "Only owners and admins can buy voice minutes." },
        { status: 403 },
      ),
    };
  return { ...organization, organizationId, user, denied: null };
}

export async function GET() {
  const ctx = await context();
  if (ctx.denied) return ctx.denied;
  const admin = createAdminClient();
  const [balance, { data: history }, { data: subscription }] =
    await Promise.all([
      voiceBalance(admin, ctx.organizationId),
      admin
        .from("voice_credit_ledger")
        .select("minutes,kind,metadata,created_at")
        .eq("organization_id", ctx.organizationId)
        .order("created_at", { ascending: false })
        .limit(12),
      admin
        .from("subscriptions")
        .select("status,provider,metadata")
        .eq("organization_id", ctx.organizationId)
        .maybeSingle(),
    ]);
  const products = dodoConfiguration().voicePackProducts;
  return NextResponse.json({
    balance,
    limits: voiceLimits,
    canPurchase: voiceIncluded(subscription),
    packs: voicePacks.map((pack) => ({
      ...pack,
      available: Boolean(products[pack.id]),
    })),
    history: history ?? [],
  });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (ctx.denied) return ctx.denied;
  const body = await request.json().catch(() => null);
  const admin = createAdminClient();

  const sync = syncSchema.safeParse(body);
  if (sync.success) {
    try {
      const payment = await getDodo().payments.retrieve(sync.data.paymentId);
      if (payment.metadata?.organization_id !== ctx.organizationId)
        return NextResponse.json(
          { error: "This payment belongs to a different workspace." },
          { status: 403 },
        );
      if (payment.status !== "succeeded")
        return NextResponse.json({
          status: payment.status ?? "processing",
          balance: await voiceBalance(admin, ctx.organizationId),
        });
      const result = await creditVoicePack(admin, {
        organizationId: ctx.organizationId,
        pack: payment.metadata.pack as (typeof voicePacks)[number]["id"],
        paymentId: payment.payment_id,
      });
      return NextResponse.json({
        status: "succeeded",
        ...result,
        balance: await voiceBalance(admin, ctx.organizationId),
      });
    } catch (error) {
      console.error("Voice pack sync failed", error);
      return NextResponse.json(
        { error: "Could not confirm the voice pack payment." },
        { status: 502 },
      );
    }
  }

  const parsed = buySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a voice pack." },
      { status: 400 },
    );
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("status,provider,metadata")
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (!voiceIncluded(subscription))
    return NextResponse.json(
      {
        error:
          "Voice minutes can be bought on an active paid plan. Trials are text-only.",
      },
      { status: 402 },
    );
  const pack = voicePacks.find((item) => item.id === parsed.data.pack)!;
  const productId = dodoConfiguration().voicePackProducts[pack.id];
  if (!productId)
    return NextResponse.json(
      { error: "Voice packs are not configured yet." },
      { status: 503 },
    );
  try {
    const session = await getDodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: ctx.user.email
        ? { email: ctx.user.email, name: ctx.user.email.split("@")[0] }
        : undefined,
      metadata: {
        organization_id: ctx.organizationId,
        user_id: ctx.user.id,
        kind: "voice_pack",
        pack: pack.id,
        minutes: String(pack.minutes),
      },
      return_url: `${publicAppUrl(request)}/app?billing=voice-return`,
      cancel_url: `${publicAppUrl(request)}/app?billing=cancelled`,
      customization: { theme: "system" },
    });
    if (!session.checkout_url)
      throw new Error("Dodo Payments did not return a checkout URL.");
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (error) {
    console.error("Voice pack checkout failed", error);
    return NextResponse.json(
      { error: "Could not start voice pack checkout." },
      { status: 502 },
    );
  }
}
