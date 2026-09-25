import { NextResponse } from "next/server";
import { z } from "zod";
import { makeBolnaCall } from "@/lib/providers/bolna";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({
  employeeId: z.string().uuid(),
  recipientPhoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/),
  phoneNumberId: z.string().uuid().optional(),
  consentConfirmed: z.literal(true),
  confirmation: z.literal("PLACE CALL"),
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
        { error: "You cannot place calls." },
        { status: 403 },
      );
    const [{ data: employee }, { data: providerAgent }, { data: limits }] =
      await Promise.all([
        supabase
          .from("ai_employees")
          .select("id,name,status,assigned_channels,usage_budget_cents")
          .eq("id", input.employeeId)
          .eq("organization_id", organizationId)
          .single(),
        supabase
          .from("ai_provider_agents")
          .select("external_agent_id,status")
          .eq("organization_id", organizationId)
          .eq("ai_employee_id", input.employeeId)
          .eq("provider", "bolna")
          .eq("channel", "telephone")
          .single(),
        supabase
          .from("spending_limits")
          .select("monthly_limit_minor,hard_stop")
          .eq("organization_id", organizationId)
          .maybeSingle(),
      ]);
    if (
      employee?.status !== "active" ||
      !employee.assigned_channels?.includes("phone") ||
      providerAgent?.status !== "active" ||
      !providerAgent.external_agent_id
    )
      return NextResponse.json(
        { error: "This telephone employee is not active." },
        { status: 409 },
      );
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: spendRows } = await supabase
      .from("credit_transactions")
      .select("monetary_amount_minor")
      .eq("organization_id", organizationId)
      .in("category", ["voice", "telephony"])
      .gte("created_at", monthStart.toISOString());
    const spentMinor = (spendRows ?? []).reduce(
      (sum, row) => sum + Math.max(0, Number(row.monetary_amount_minor ?? 0)),
      0,
    );
    const limitMinor = Math.min(
      Number(limits?.monthly_limit_minor ?? employee.usage_budget_cents),
      Number(employee.usage_budget_cents),
    );
    if (limits?.hard_stop !== false && spentMinor >= limitMinor)
      return NextResponse.json(
        { error: "The workspace telephone spending limit has been reached." },
        { status: 402 },
      );
    const { data: phone } = input.phoneNumberId
      ? await supabase
          .from("phone_numbers")
          .select("id,e164,status,assigned_employee_ids")
          .eq("id", input.phoneNumberId)
          .eq("organization_id", organizationId)
          .single()
      : await supabase
          .from("phone_numbers")
          .select("id,e164,status,assigned_employee_ids")
          .eq("organization_id", organizationId)
          .eq("provider", "bolna")
          .eq("status", "active")
          .contains("assigned_employee_ids", [input.employeeId])
          .limit(1)
          .maybeSingle();
    if (phone && phone.status !== "active")
      return NextResponse.json(
        { error: "The selected phone number is not active." },
        { status: 409 },
      );
    const result = await makeBolnaCall({
      agentId: providerAgent.external_agent_id,
      recipientPhoneNumber: input.recipientPhoneNumber,
      fromPhoneNumber: phone?.e164,
      userData: {
        resolvex_organization_id: organizationId,
        resolvex_employee_id: input.employeeId,
      },
    });
    const executionId = String(result.execution_id ?? result.id ?? "");
    if (!executionId)
      throw new Error(
        "The telephony provider queued the call without returning an execution ID.",
      );
    const { data: call, error: callError } = await supabase
      .from("calls")
      .upsert(
        {
          organization_id: organizationId,
          ai_employee_id: input.employeeId,
          phone_number_id: phone?.id ?? null,
          provider: "bolna",
          external_call_id: executionId,
          direction: "outbound",
          handler_type: "ai",
          from_number: phone?.e164 ?? null,
          to_number: input.recipientPhoneNumber,
          status: "queued",
          consent_recorded_at: new Date().toISOString(),
          metadata: { initiation: result, initiated_by: user.id },
        },
        { onConflict: "provider,external_call_id" },
      )
      .select("id,status,external_call_id")
      .single();
    if (callError) throw callError;
    await createAdminClient()
      .from("employee_jobs")
      .upsert(
        {
          organization_id: organizationId,
          ai_employee_id: input.employeeId,
          job_type: "provider_reconciliation",
          trigger_type: "bolna_call_started",
          status: "queued",
          idempotency_key: `bolna-reconcile:${executionId}`,
          input: { execution_id: executionId },
          run_at: new Date(Date.now() + 15_000).toISOString(),
          max_attempts: 10,
          timeout_seconds: 30,
          max_tool_calls: 0,
          max_spend_minor: 0,
        },
        { onConflict: "organization_id,idempotency_key" },
      );
    return NextResponse.json(
      {
        call: call ? { ...call, provider: "managed_telephony" } : call,
        provider: "managed_telephony",
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Call failed." },
      { status: 400 },
    );
  }
}
