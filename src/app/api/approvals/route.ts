import { after, NextResponse } from "next/server";
import { z } from "zod";
import { executeComposioTool } from "@/lib/providers/composio";
import { reserveEmployeeAction } from "@/lib/billing/guards";
import {
  assignBolnaInboundAgent,
  createBolnaSipTrunk,
  listBolnaPhoneNumbers,
} from "@/lib/providers/bolna";
import { sanitizeToolOutput } from "@/lib/security/tool-policy";
import { decryptServerSecret } from "@/lib/security/secrets";
import { processEmployeeJobs } from "@/lib/jobs/runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

const managedConnectionActions = new Set([
  "managed_sip_connection",
  // Backward compatibility for requests created before provider white-labelling.
  "bolna_sip_connection",
]);

const retiredPurchaseActions = new Set([
  "phone_number_purchase",
  "managed_phone_purchase",
  "bolna_phone_purchase",
]);

function whiteLabelTelephony(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(whiteLabelTelephony);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key.replaceAll("bolna", "managed_telephony"),
        whiteLabelTelephony(item),
      ]),
    );
  if (typeof value === "string") {
    if (value === "bolna_phone_purchase") return "managed_phone_purchase";
    if (value === "bolna_sip_connection") return "managed_sip_connection";
    return value.replaceAll(/bolna/gi, "managed telephony");
  }
  return value;
}

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
  return NextResponse.json({
    approvals: whiteLabelTelephony(data ?? []),
  });
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
    if (retiredPurchaseActions.has(current.action_type))
      return NextResponse.json(
        {
          error:
            "ResolveX no longer purchases phone numbers. Buy the number from your carrier, then connect it here.",
        },
        { status: 410 },
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
    if (input.decision === "rejected") {
      await supabase
        .from("tool_executions")
        .update({ status: "blocked", error: "Rejected by workspace approver." })
        .eq("approval_id", input.id)
        .eq("organization_id", organizationId);
      await createAdminClient()
        .from("employee_jobs")
        .update({
          status: "failed",
          error: "Required action was rejected by a workspace approver.",
          completed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("approval_id", input.id)
        .eq("organization_id", organizationId)
        .eq("status", "waiting_approval");
    }

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
          await reserveEmployeeAction(createAdminClient(), organizationId);
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
        } else if (managedConnectionActions.has(current.action_type)) {
          const payload = current.payload as Record<string, unknown>;
          const phoneId = String(payload.phone_number_id ?? "");
          const employeeId = String(
            current.ai_employee_id ?? payload.ai_employee_id ?? "",
          );
          const [{ data: phone }, { data: employee }, { data: bolnaAgent }] =
            await Promise.all([
              supabase
                .from("phone_numbers")
                .select("id,e164,country,provider_metadata")
                .eq("id", phoneId)
                .eq("organization_id", organizationId)
                .single(),
              supabase
                .from("ai_employees")
                .select("id,name,status,assigned_channels")
                .eq("id", employeeId)
                .eq("organization_id", organizationId)
                .single(),
              supabase
                .from("ai_provider_agents")
                .select("external_agent_id,status")
                .eq("organization_id", organizationId)
                .eq("ai_employee_id", employeeId)
                .eq("provider", "bolna")
                .eq("channel", "telephone")
                .single(),
            ]);
          if (!phone) throw new Error("Phone-number request no longer exists.");
          if (
            employee?.status !== "active" ||
            !employee.assigned_channels?.includes("phone") ||
            bolnaAgent?.status !== "active" ||
            !bolnaAgent.external_agent_id
          )
            throw new Error(
              "Activate the selected telephone employee before approving this request.",
            );
          await supabase
            .from("phone_numbers")
            .update({ status: "provisioning" })
            .eq("id", phone.id);

          const sip = (payload.sip ?? {}) as Record<string, unknown>;
          const encryptedPassword =
            typeof sip.authPasswordEncrypted === "string"
              ? sip.authPasswordEncrypted
              : undefined;
          const providerResult = await createBolnaSipTrunk({
            name: `ResolveX ${organizationId.slice(0, 8)} ${phone.e164}`,
            provider: String(sip.provider || "custom"),
            gatewayAddress: String(sip.gatewayAddress || ""),
            port: Number(sip.port || 5060),
            authType: String(sip.authType) as "userpass" | "ip-based",
            authUsername:
              typeof sip.authUsername === "string"
                ? sip.authUsername
                : undefined,
            authPassword: encryptedPassword
              ? decryptServerSecret(encryptedPassword)
              : undefined,
            ipIdentifiers: Array.isArray(sip.ipIdentifiers)
              ? sip.ipIdentifiers.map(String)
              : undefined,
            phoneNumber: phone.e164,
          });
          const returnedNumbers = Array.isArray(providerResult.phone_numbers)
            ? (providerResult.phone_numbers as Array<Record<string, unknown>>)
            : [];
          let externalPhoneId = String(returnedNumbers[0]?.id ?? "");
          if (!externalPhoneId) {
            const accountNumbers = await listBolnaPhoneNumbers();
            const matched = accountNumbers.find(
              (row) =>
                String(row.phone_number ?? row.number) === phone.e164 ||
                `+${String(row.phone_number ?? row.number).replace(/^\+/, "")}` ===
                  phone.e164,
            );
            externalPhoneId = String(matched?.id ?? "");
          }
          if (!externalPhoneId)
            throw new Error(
              "The telephony provider completed the operation without returning a phone-number ID.",
            );
          const inbound = await assignBolnaInboundAgent({
            agentId: bolnaAgent.external_agent_id,
            phoneNumberId: externalPhoneId,
          });
          executionResult = {
            ...providerResult,
            inbound,
            phone_number_id: externalPhoneId,
          };
          await supabase
            .from("phone_numbers")
            .update({
              status: "active",
              provider: "bolna",
              compliance_status: "not_required",
              assigned_employee_ids: [employee.id],
              external_id: externalPhoneId,
              sip_trunk_id: String(providerResult.id ?? "") || null,
              provider_metadata: {
                ...phone.provider_metadata,
                bolna_phone_number_id: externalPhoneId,
                bolna_agent_id: bolnaAgent.external_agent_id,
                operation: current.action_type,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", phone.id);
          // Remove encrypted connection material after successful execution.
          await supabase
            .from("approval_requests")
            .update({
              payload: {
                phone_number_id: phone.id,
                ai_employee_id: employee.id,
                provider: "bolna",
                credentials_consumed: true,
              },
            })
            .eq("id", input.id);
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
        const admin = createAdminClient();
        await admin
          .from("employee_jobs")
          .update({
            status: "retrying",
            run_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null,
          })
          .eq("approval_id", input.id)
          .eq("organization_id", organizationId)
          .eq("status", "waiting_approval");
        after(async () => {
          await processEmployeeJobs(createAdminClient(), { limit: 10 });
        });
        return NextResponse.json({
          approval: whiteLabelTelephony(executed),
        });
      } catch (executionError) {
        const message =
          executionError instanceof Error
            ? executionError.message
            : "Approved action failed.";
        const failureUpdates = [
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
        ];
        if (managedConnectionActions.has(current.action_type)) {
          const phoneId = String(current.payload?.phone_number_id ?? "");
          if (phoneId) {
            failureUpdates.push(
              supabase
                .from("phone_numbers")
                .update({
                  status: "failed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", phoneId)
                .eq("organization_id", organizationId),
            );
          }
        }
        await Promise.all(failureUpdates);
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
