import { NextResponse } from "next/server";
import { billingProvider } from "@/lib/billing/provider";
import { getDodo } from "@/lib/billing/dodo";
import { publicAppUrl } from "@/lib/app-url";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function POST(request: Request) {
  if (billingProvider() !== "dodo") {
    return NextResponse.json(
      {
        error:
          "Payment management is available for Dodo Payments subscriptions.",
      },
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
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .eq("provider", "dodo")
    .maybeSingle();
  if (!data?.provider_customer_id)
    return NextResponse.json(
      { error: "Complete checkout before managing payment." },
      { status: 409 },
    );
  try {
    const session = await getDodo().customers.customerPortal.create(
      data.provider_customer_id,
      { return_url: `${publicAppUrl(request)}/app` },
    );
    return NextResponse.json({ url: session.link });
  } catch (error) {
    console.error("Dodo portal session failed", error);
    return NextResponse.json(
      { error: "Could not open payment management." },
      { status: 502 },
    );
  }
}
