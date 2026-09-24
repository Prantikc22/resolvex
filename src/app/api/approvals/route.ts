import { NextResponse } from "next/server";
import { z } from "zod";
import { executeComposioTool } from "@/lib/providers/composio";
import { sanitizeToolOutput } from "@/lib/security/tool-policy";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { provisionApprovedPhone } from "@/lib/voice/provision";

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
      .select("id,status,expires_at,action_type,ai_employee_id,payload")
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

    let executionResult: unknown = null;
    if (input.decision === "approved") {
      try {
        if (current.action_type === "integration_tool") {
          const payload = current.payload as Record<string, unknown>;
          const toolkit = String(payload.toolkit ?? "");
          const toolSlug = String(payload.tool_slug ?? "");
          const argumentsValue =
            payload.arguments && typeof payload.arguments === "object"
              ? (payload.arguments as Record<string, unknown>)
              : {};
          const { data: execution, error: executionError } = await supabase
            .from("tool_executions")
            .update({
              status: "running",
              started_at: new Date().toISOString(),
              error: null,
            })
            .eq("approval_id", input.id)
            .eq("organization_id", organizationId)
            .select("id")
            .single();
          if (executionError) throw executionError;
          executionResult = sanitizeToolOutput(
            await executeComposioTool({
              organizationId,
              toolkit,
              toolSlug,
              arguments: argumentsValue,
            }),
          );
          await supabase
            .from("tool_executions")
            .update({
              status: "succeeded",
              output: executionResult,
              completed_at: new Date().toISOString(),
            })
            .eq("id", execution.id);
        } else if (current.action_type === "phone_number_purchase") {
          const phoneId = String(current.payload?.phone_number_id ?? "");
          const employeeId = String(
            current.ai_employee_id ?? current.payload?.ai_employee_id ?? "",
          );
          const [{ data: phone }, { data: employee }] = await Promise.all([
            supabase
              .from("phone_numbers")
              .select("id,e164,country,provider_metadata")
              .eq("id", phoneId)
              .eq("organization_id", organizationId)
              .single(),
            supabase
              .from("ai_employees")
              .select("id,name,status,external_agent_id,assigned_channels")
              .eq("id", employeeId)
              .eq("organization_id", organizationId)
              .single(),
          ]);
          if (!phone) throw new Error("Phone-number request no longer exists.");
          if (
            !employee?.external_agent_id ||
            employee.status !== "active" ||
            !employee.assigned_channels?.includes("voice")
          )
            throw new Error(
              "Activate the selected voice employee before approving this purchase.",
            );
          await supabase
            .from("phone_numbers")
            .update({ status: "provisioning" })
            .eq("id", phone.id);
          executionResult = await provisionApprovedPhone(phone, employee);
          const result = executionResult as Record<string, string>;
          await supabase
            .from("phone_numbers")
            .update({
              status: "active",
              compliance_status:
                phone.country === "IN" ? "accepted" : "not_required",
              assigned_employee_ids: [employee.id],
              external_id: phone.e164,
              sip_trunk_id: result.plivo_trunk_id,
              elevenlabs_phone_number_id: result.elevenlabs_phone_number_id,
              provider_metadata: {
                ...phone.provider_metadata,
                ...result,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", phone.id);
        }
        const { data: executed, error: executedError } = await supabase
          .from("approval_requests")
          .update({
            status: "executed",
            result: executionResult,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.id)
          .eq("organization_id", organizationId)
          .select("id,status,decided_at,result")
          .single();
        if (executedError) throw executedError;
        await supabase.from("audit_events").insert({
          organization_id: organizationId,
          actor_id: user.id,
          action: "approval.executed",
          entity_type: "approval_request",
          entity_id: input.id,
          metadata: { action_type: current.action_type },
        });
        return NextResponse.json({ approval: executed });
      } catch (executionError) {
        const message =
          executionError instanceof Error
            ? executionError.message
            : "Approved action failed.";
        await Promise.all([
          supabase
            .from("approval_requests")
            .update({
              status: "failed",
              result: { error: message },
              updated_at: new Date().toISOString(),
            })
            .eq("id", input.id),
          supabase
            .from("tool_executions")
            .update({
              status: "failed",
              error: message,
              completed_at: new Date().toISOString(),
            })
            .eq("approval_id", input.id),
        ]);
        return NextResponse.json(
          { error: `Approval recorded, but execution failed: ${message}` },
          { status: 502 },
        );
      }
    }
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
