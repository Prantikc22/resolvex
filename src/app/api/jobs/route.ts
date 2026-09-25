import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const cancelSchema = z.object({
  id: z.string().uuid(),
  action: z.literal("cancel"),
});

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("employee_jobs")
    .select(
      "id,ai_employee_id,automation_id,job_type,trigger_type,status,input,state,output,error,run_at,attempt,max_attempts,max_tool_calls,tool_calls_used,max_spend_minor,spend_minor,approval_id,cancel_requested_at,started_at,completed_at,created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ jobs: data ?? [] });
}

export async function PATCH(request: Request) {
  try {
    const input = cancelSchema.parse(await request.json());
    const { user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can cancel jobs." },
        { status: 403 },
      );
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employee_jobs")
      .update({ cancel_requested_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .in("status", ["queued", "retrying", "running", "waiting_approval"])
      .select("id,status,cancel_requested_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cancellation failed.",
      },
      { status: 400 },
    );
  }
}
