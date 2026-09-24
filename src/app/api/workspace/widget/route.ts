import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("organizations")
    .select("public_widget_key,widget_enabled,settings")
    .eq("id", organizationId)
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    key: data.public_widget_key,
    enabled: data.widget_enabled,
    accent: data.settings?.widget_accent ?? "#ff5c35",
    headerColor: data.settings?.widget_header_color ?? "#111318",
    agentName: data.settings?.widget_agent_name ?? "Arlo",
    welcomeTitle: data.settings?.widget_welcome_title ?? "How can we help?",
    welcomeMessage:
      data.settings?.widget_welcome_message ??
      "Ask naturally. We answer from approved knowledge or bring in a person.",
    logoUrl: data.settings?.widget_logo_url ?? "",
    position: data.settings?.widget_position ?? "right",
  });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rotate") }),
  z.object({ action: z.literal("toggle"), enabled: z.boolean() }),
  z.object({
    action: z.literal("customize"),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    headerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    agentName: z.string().trim().min(2).max(40),
    welcomeTitle: z.string().trim().min(2).max(80),
    welcomeMessage: z.string().trim().min(2).max(240),
    logoUrl: z.union([
      z.literal(""),
      z
        .string()
        .url()
        .max(1000)
        .refine((value) => /^https?:\/\//i.test(value), {
          message: "Logo URL must use http or https.",
        }),
    ]),
    position: z.enum(["left", "right"]),
  }),
]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only workspace managers can change widget access." },
        { status: 403 },
      );
    let update: Record<string, unknown>;
    if (input.action === "rotate") update = { public_widget_key: randomUUID() };
    else if (input.action === "toggle")
      update = { widget_enabled: input.enabled };
    else {
      const { data: current, error: currentError } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", organizationId)
        .single();
      if (currentError) throw currentError;
      update = {
        settings: {
          ...(current.settings ?? {}),
          widget_accent: input.accent,
          widget_header_color: input.headerColor,
          widget_agent_name: input.agentName,
          widget_welcome_title: input.welcomeTitle,
          widget_welcome_message: input.welcomeMessage,
          widget_logo_url: input.logoUrl,
          widget_position: input.position,
        },
      };
    }
    const { data, error } = await supabase
      .from("organizations")
      .update(update)
      .eq("id", organizationId)
      .select("public_widget_key,widget_enabled,settings")
      .single();
    if (error) throw error;
    return NextResponse.json({
      key: data.public_widget_key,
      enabled: data.widget_enabled,
      accent: data.settings?.widget_accent ?? "#ff5c35",
      headerColor: data.settings?.widget_header_color ?? "#111318",
      agentName: data.settings?.widget_agent_name ?? "Arlo",
      welcomeTitle: data.settings?.widget_welcome_title ?? "How can we help?",
      welcomeMessage: data.settings?.widget_welcome_message ?? "",
      logoUrl: data.settings?.widget_logo_url ?? "",
      position: data.settings?.widget_position ?? "right",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}
