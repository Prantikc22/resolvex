import { NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";

const keySchema = z.string().uuid();

export async function GET(request: Request) {
  try {
    const key = keySchema.parse(new URL(request.url).searchParams.get("key"));
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,settings,widget_enabled")
      .eq("public_widget_key", key)
      .single();
    if (error || !data?.widget_enabled)
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 404 },
      );
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status,provider,metadata")
      .eq("organization_id", data.id)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription)) {
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 402 },
      );
    }
    const settings = (data.settings ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      name: data.name,
      accent:
        typeof settings.widget_accent === "string"
          ? settings.widget_accent
          : "#ff5c35",
      agent: "Arlo",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid messenger key." },
      { status: 400 },
    );
  }
}
