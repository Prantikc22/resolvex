import { NextResponse } from "next/server";
import { billingProvider } from "@/lib/billing/provider";
import { getPaddle } from "@/lib/billing/paddle";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function POST() {
  if (billingProvider() !== "paddle") {
    return NextResponse.json(
      { error: "Payment management is available for Paddle subscriptions." },
      { status: 409 },
    );
  }
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (membershipRole !== "owner" && membershipRole !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await supabase
    .from("subscriptions")
    .select("provider_customer_id,provider_subscription_id")
    .eq("organization_id", organizationId)
    .eq("provider", "paddle")
    .maybeSingle();
  if (!data?.provider_customer_id)
    return NextResponse.json(
      { error: "Complete Paddle checkout before managing payment." },
      { status: 409 },
    );
  try {
    const session = await getPaddle().customerPortalSessions.create(
      data.provider_customer_id,
      data.provider_subscription_id ? [data.provider_subscription_id] : [],
    );
    return NextResponse.json({ url: session.urls.general.overview });
  } catch (error) {
    console.error("Paddle portal session failed", error);
    return NextResponse.json(
      { error: "Could not open payment management." },
      { status: 502 },
    );
  }
}
