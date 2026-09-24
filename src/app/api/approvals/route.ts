import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("approval_requests")
    .select(
      "id,ai_employee_id,action_type,title,risk,status,payload,result,expires_at,created_at,decided_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ approvals: data ?? [] });
}

export async function PATCH(request: Request) {
  try {
    const input = decisionSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can decide approvals." },
        { status: 403 },
      );
    const { data: current } = await supabase
      .from("approval_requests")
      .select("id,status,expires_at")
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .single();
    if (!current || current.status !== "pending")
      return NextResponse.json(
        { error: "Approval is no longer pending." },
        { status: 409 },
      );
    if (new Date(current.expires_at) <= new Date()) {
      await supabase
        .from("approval_requests")
        .update({ status: "expired" })
        .eq("id", input.id);
      return NextResponse.json(
        { error: "Approval has expired." },
        { status: 410 },
      );
    }
    const { data, error } = await supabase
      .from("approval_requests")
      .update({
        status: input.decision,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select("id,status,decided_at")
      .single();
    if (error) throw error;
    if (input.decision === "rejected")
      await supabase
        .from("tool_executions")
        .update({ status: "blocked", error: "Rejected by workspace approver." })
        .eq("approval_id", input.id)
        .eq("organization_id", organizationId);
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: `approval.${input.decision}`,
      entity_type: "approval_request",
      entity_id: input.id,
      metadata: {},
    });
    return NextResponse.json({ approval: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decision failed." },
      { status: 400 },
    );
  }
}
