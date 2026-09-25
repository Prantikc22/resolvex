import { NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";

const keySchema = z.string().uuid();
const cors = { "Access-Control-Allow-Origin": "*" };

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
        { status: 404, headers: cors },
      );
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status,provider,metadata")
      .eq("organization_id", data.id)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription)) {
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 402, headers: cors },
      );
    }
    const settings = (data.settings ?? {}) as Record<string, unknown>;
    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id,name,description,assigned_channels")
      .eq("organization_id", data.id)
      .eq("status", "active")
      .contains("assigned_channels", ["chat"])
      .order("provisioned_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!employee) {
      return NextResponse.json(
        { error: "No active chat employee is assigned to this messenger." },
        { status: 409, headers: cors },
      );
    }
    return NextResponse.json(
      {
        name: data.name,
        accent:
          typeof settings.widget_accent === "string"
            ? settings.widget_accent
            : "#ff5c35",
        headerColor:
          typeof settings.widget_header_color === "string"
            ? settings.widget_header_color
            : "#111318",
        agent:
          typeof settings.widget_agent_name === "string"
            ? settings.widget_agent_name
            : employee.name,
        welcomeTitle:
          typeof settings.widget_welcome_title === "string"
            ? settings.widget_welcome_title
            : "How can we help?",
        welcomeMessage:
          typeof settings.widget_welcome_message === "string"
            ? settings.widget_welcome_message
            : employee.description,
        logoUrl:
          typeof settings.widget_logo_url === "string"
            ? settings.widget_logo_url
            : null,
        position: settings.widget_position === "left" ? "left" : "right",
        employeeId: employee.id,
        websiteVoiceEnabled: settings.website_voice_enabled === true,
        humanHandoffEnabled: settings.human_handoff_enabled !== false,
      },
      {
        headers: {
          ...cors,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid messenger key." },
      { status: 400, headers: cors },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
