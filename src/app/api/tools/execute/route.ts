import { NextResponse } from "next/server";
import { z } from "zod";
import { executeComposioTool } from "@/lib/providers/composio";
import { reserveEmployeeAction } from "@/lib/billing/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  defaultToolAccess,
  sanitizeToolOutput,
  type ToolAccess,
} from "@/lib/security/tool-policy";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({
  employeeId: z.string().uuid(),
  toolkit: z.string().trim().min(2).max(80),
  toolSlug: z.string().trim().min(2).max(200),
  arguments: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(8).max(200),
  approvalId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin", "agent"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "A read-only member cannot execute tools." },
        { status: 403 },
      );
    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id,status,connected_toolkits")
      .eq("id", input.employeeId)
      .eq("organization_id", organizationId)
      .single();
    if (!employee || !["active", "testing"].includes(employee.status))
      return NextResponse.json(
        { error: "AI employee is not active." },
        { status: 409 },
      );
    if (!employee.connected_toolkits?.includes(input.toolkit))
      return NextResponse.json(
        { error: "This employee is not authorized for that application." },
        { status: 403 },
      );
    const { data: permission } = await supabase
      .from("tool_permissions")
      .select("access")
      .eq("organization_id", organizationId)
      .eq("ai_employee_id", input.employeeId)
      .eq("toolkit", input.toolkit)
      .in("tool_slug", [input.toolSlug, "*"])
      .order("tool_slug", { ascending: false })
      .limit(1)
      .maybeSingle();
    const access = (permission?.access ??
      defaultToolAccess(input.toolSlug)) as ToolAccess;
    if (access === "deny")
      return NextResponse.json(
        { error: "This tool is blocked by policy." },
        { status: 403 },
      );
    let approved = false;
    if (input.approvalId) {
      const { data: approval } = await supabase
        .from("approval_requests")
        .select("id,status,expires_at,payload")
        .eq("id", input.approvalId)
        .eq("organization_id", organizationId)
        .eq("ai_employee_id", input.employeeId)
        .single();
      approved = Boolean(
        approval?.status === "approved" &&
        new Date(approval.expires_at) > new Date() &&
        approval.payload?.tool_slug === input.toolSlug &&
        approval.payload?.idempotency_key === input.idempotencyKey,
      );
    }
    if (access === "approval_required" && !approved) {
      const { data: existingExecution } = await supabase
        .from("tool_executions")
        .select("id,approval_id,status")
        .eq("organization_id", organizationId)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existingExecution)
        return NextResponse.json(
          {
            status: existingExecution.status,
            approvalId: existingExecution.approval_id,
            executionId: existingExecution.id,
          },
          { status: 202 },
        );
      const { data: approval, error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          organization_id: organizationId,
          ai_employee_id: input.employeeId,
          requested_by: user.id,
          action_type: "integration_tool",
          title: `${input.toolSlug} in ${input.toolkit}`,
          risk: "high",
          payload: {
            toolkit: input.toolkit,
            tool_slug: input.toolSlug,
            arguments: input.arguments,
            idempotency_key: input.idempotencyKey,
          },
        })
        .select("id")
        .single();
      if (approvalError) throw approvalError;
      const { data: execution, error: executionError } = await supabase
        .from("tool_executions")
        .insert({
          organization_id: organizationId,
          ai_employee_id: input.employeeId,
          approval_id: approval.id,
          toolkit: input.toolkit,
          tool_slug: input.toolSlug,
          status: "pending_approval",
          input: input.arguments,
          idempotency_key: input.idempotencyKey,
        })
        .select("id")
        .single();
      if (executionError) throw executionError;
      return NextResponse.json(
        {
          status: "pending_approval",
          approvalId: approval.id,
          executionId: execution.id,
        },
        { status: 202 },
      );
    }
    const { data: existing } = await supabase
      .from("tool_executions")
      .select("id,status,output,error")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing && ["succeeded", "running"].includes(existing.status)) {
      return NextResponse.json({ execution: existing });
    }
    const executionPayload = {
      organization_id: organizationId,
      ai_employee_id: input.employeeId,
      approval_id: input.approvalId ?? null,
      toolkit: input.toolkit,
      tool_slug: input.toolSlug,
      status: "running",
      input: input.arguments,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    };
    const { data: execution, error: startError } = await supabase
      .from("tool_executions")
      .upsert(executionPayload, {
        onConflict: "organization_id,idempotency_key",
      })
      .select("id")
      .single();
    if (startError) throw startError;
    try {
      await reserveEmployeeAction(createAdminClient(), organizationId);
      const result = sanitizeToolOutput(
        await executeComposioTool({
          organizationId,
          toolkit: input.toolkit,
          toolSlug: input.toolSlug,
          arguments: input.arguments,
        }),
      );
      const { data, error } = await supabase
        .from("tool_executions")
        .update({
          status: "succeeded",
          output: result,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)
        .select("id,status,output,completed_at")
        .single();
      if (error) throw error;
      if (input.approvalId)
        await supabase
          .from("approval_requests")
          .update({
            status: "executed",
            result,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.approvalId)
          .eq("organization_id", organizationId);
      return NextResponse.json({ execution: data });
    } catch (toolError) {
      const message =
        toolError instanceof Error
          ? toolError.message
          : "Tool execution failed.";
      await supabase
        .from("tool_executions")
        .update({
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);
      throw toolError;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Tool execution failed.",
      },
      { status: 400 },
    );
  }
}
