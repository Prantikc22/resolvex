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
  });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rotate") }),
  z.object({ action: z.literal("toggle"), enabled: z.boolean() }),
]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, organizationId } = await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    const update =
      input.action === "rotate"
        ? { public_widget_key: randomUUID() }
        : { widget_enabled: input.enabled };
    const { data, error } = await supabase
      .from("organizations")
      .update(update)
      .eq("id", organizationId)
      .select("public_widget_key,widget_enabled")
      .single();
    if (error) throw error;
    return NextResponse.json({
      key: data.public_widget_key,
      enabled: data.widget_enabled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}
