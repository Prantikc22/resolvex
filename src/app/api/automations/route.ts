import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contains: z.string().trim().max(100).optional().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  tag: z.string().trim().max(40).optional().default(""),
  handoff: z.boolean().default(false),
});
const updateSchema = z.object({ id: z.string().uuid(), enabled: z.boolean() });
const deleteSchema = z.object({ id: z.string().uuid() });

function manageable(role: string | null) {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("automations")
    .select("id,name,enabled,trigger_config,actions,run_count,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ automations: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can create automations." },
        { status: 403 },
      );
    const actions = [
      { type: "set_priority", value: input.priority },
      ...(input.tag ? [{ type: "add_tag", value: input.tag }] : []),
      ...(input.handoff ? [{ type: "handoff" }] : []),
    ];
    const { data, error } = await supabase
      .from("automations")
      .insert({
        organization_id: organizationId,
        name: input.name,
        enabled: true,
        trigger_config: { event: "new_message", contains: input.contains },
        actions,
      })
      .select("id,name,enabled,trigger_config,actions,run_count,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ automation: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create automation.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const input = updateSchema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can update automations." },
        { status: 403 },
      );
    const { data, error } = await supabase
      .from("automations")
      .update({ enabled: input.enabled })
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select("id,name,enabled,trigger_config,actions,run_count,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ automation: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update automation.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const input = deleteSchema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can delete automations." },
        { status: 403 },
      );
    const { error } = await supabase
      .from("automations")
      .delete()
      .eq("id", input.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete automation.",
      },
      { status: 400 },
    );
  }
}
