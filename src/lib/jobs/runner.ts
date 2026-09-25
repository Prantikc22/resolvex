import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { askArlo } from "@/lib/ai/arlo";
import { reserveEmployeeAction } from "@/lib/billing/guards";
import { usageGuards } from "@/lib/pricing";
import { createHumanHandoff } from "@/lib/handoff";
import { executeComposioTool } from "@/lib/providers/composio";
import { getBolnaExecution } from "@/lib/providers/bolna";
import {
  defaultToolAccess,
  sanitizeToolOutput,
  type ToolAccess,
} from "@/lib/security/tool-policy";
import { reconcileBolnaExecution } from "@/lib/voice/bolna-events";

type JsonRecord = Record<string, unknown>;
type FlowAction = JsonRecord & { type?: string; value?: string };
type EmployeeJob = JsonRecord & {
  id: string;
  organization_id: string;
  ai_employee_id?: string | null;
  automation_id?: string | null;
  workflow_run_id?: string | null;
  job_type: string;
  attempt: number;
  max_attempts: number;
  timeout_seconds: number;
  max_tool_calls: number;
  tool_calls_used: number;
  max_spend_minor: number;
  spend_minor: number;
  input: JsonRecord;
  state: JsonRecord;
  cancel_requested_at?: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function pathValue(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    const row = asRecord(value);
    return row[key];
  }, source);
}

function resolveTemplates(value: unknown, context: JsonRecord): unknown {
  if (Array.isArray(value))
    return value.map((entry) => resolveTemplates(entry, context));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, entry]) => [
        key,
        resolveTemplates(entry, context),
      ]),
    );
  if (typeof value !== "string") return value;
  const exact = value.match(/^\{\{\s*([^}]+)\s*\}\}$/);
  if (exact) return pathValue(context, exact[1].trim()) ?? null;
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) =>
    String(pathValue(context, path.trim()) ?? ""),
  );
}

function nextRun(schedule: JsonRecord, from: Date) {
  // Older flows may predate the minimum interval; clamp rather than trust.
  const minutes = Math.max(
    usageGuards.minFlowIntervalMinutes,
    Number(schedule.interval_minutes ?? 0),
  );
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

export async function enqueueDueScheduledFlows(admin: SupabaseClient) {
  const now = new Date();
  const { data: rules, error } = await admin
    .from("automations")
    .select("id,organization_id,trigger_config,schedule_config,next_run_at")
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString())
    .limit(100);
  if (error) throw error;
  let queued = 0;
  for (const rule of rules ?? []) {
    const event = String(rule.trigger_config?.event ?? "");
    if (!event.startsWith("schedule_")) continue;
    const dueAt = String(rule.next_run_at);
    const idempotencyKey = `flow:${rule.id}:schedule:${dueAt}`;
    const { data: run, error: runError } = await admin
      .from("workflow_runs")
      .upsert(
        {
          organization_id: rule.organization_id,
          automation_id: rule.id,
          trigger_type: event,
          status: "queued",
          input: { scheduled_for: dueAt },
          idempotency_key: idempotencyKey,
        },
        {
          onConflict: "organization_id,idempotency_key",
          ignoreDuplicates: true,
        },
      )
      .select("id")
      .maybeSingle();
    if (runError) throw runError;
    if (run) {
      const { error: jobError } = await admin.from("employee_jobs").upsert(
        {
          organization_id: rule.organization_id,
          automation_id: rule.id,
          workflow_run_id: run.id,
          job_type: "flow",
          trigger_type: event,
          status: "queued",
          idempotency_key: idempotencyKey,
          input: { scheduled_for: dueAt },
          max_attempts: 5,
          timeout_seconds: 90,
          max_tool_calls: 5,
          max_spend_minor: 100,
        },
        {
          onConflict: "organization_id,idempotency_key",
          ignoreDuplicates: true,
        },
      );
      if (jobError) throw jobError;
      queued += 1;
    }
    const schedule = asRecord(rule.schedule_config);
    await admin
      .from("automations")
      .update({
        last_run_at: dueAt,
        next_run_at:
          event === "schedule_recurring" ? nextRun(schedule, now) : null,
        ...(event === "schedule_once" ? { enabled: false } : {}),
      })
      .eq("id", rule.id)
      .eq("organization_id", rule.organization_id)
      .eq("next_run_at", dueAt);
  }
  return queued;
}

async function executeComposioAction(
  admin: SupabaseClient,
  job: EmployeeJob,
  action: FlowAction,
  actionIndex: number,
  priorResults: unknown[],
) {
  const toolkit = String(action.toolkit ?? "");
  const toolSlug = String(action.tool_slug ?? action.toolSlug ?? "");
  const employeeId = String(action.employee_id ?? job.ai_employee_id ?? "");
  const args = asRecord(
    resolveTemplates(action.arguments, {
      input: job.input,
      results: priorResults,
    }),
  );
  if (!toolkit || !toolSlug || !employeeId)
    throw new Error(
      "A Composio flow action requires employee, toolkit, and tool.",
    );
  const { data: employee } = await admin
    .from("ai_employees")
    .select("id,status,connected_toolkits")
    .eq("id", employeeId)
    .eq("organization_id", job.organization_id)
    .single();
  if (
    employee?.status !== "active" ||
    !employee.connected_toolkits?.includes(toolkit)
  )
    throw new Error("The employee is not active or authorized for this app.");
  const { data: permission } = await admin
    .from("tool_permissions")
    .select("access")
    .eq("organization_id", job.organization_id)
    .eq("ai_employee_id", employeeId)
    .eq("toolkit", toolkit)
    .in("tool_slug", [toolSlug, "*"])
    .order("tool_slug", { ascending: false })
    .limit(1)
    .maybeSingle();
  const access = (permission?.access ??
    defaultToolAccess(toolSlug)) as ToolAccess;
  if (access === "deny")
    throw new Error("This flow action is denied by policy.");
  const actionKey = `${job.idempotency_key ?? job.id}:${actionIndex}:${toolSlug}`;
  if (access === "approval_required") {
    const approvalId =
      job.approval_id && Number(job.state?.action_index ?? 0) === actionIndex
        ? String(job.approval_id)
        : null;
    if (approvalId) {
      const { data: approval } = await admin
        .from("approval_requests")
        .select("status,result")
        .eq("id", approvalId)
        .eq("organization_id", job.organization_id)
        .single();
      if (approval?.status === "executed") return approval.result;
      if (["rejected", "expired", "failed"].includes(approval?.status ?? ""))
        throw new Error(`Required approval is ${approval?.status}.`);
      return { waitingApprovalId: approvalId };
    }
    const { data: approval, error: approvalError } = await admin
      .from("approval_requests")
      .insert({
        organization_id: job.organization_id,
        ai_employee_id: employeeId,
        action_type: "integration_tool",
        title: `${toolSlug} in ${toolkit}`,
        risk: "high",
        payload: {
          toolkit,
          tool_slug: toolSlug,
          arguments: args,
          idempotency_key: actionKey,
          employee_job_id: job.id,
        },
      })
      .select("id")
      .single();
    if (approvalError) throw approvalError;
    const { error: executionError } = await admin
      .from("tool_executions")
      .insert({
        organization_id: job.organization_id,
        ai_employee_id: employeeId,
        approval_id: approval.id,
        toolkit,
        tool_slug: toolSlug,
        status: "pending_approval",
        input: args,
        idempotency_key: actionKey,
      });
    if (executionError) throw executionError;
    return { waitingApprovalId: approval.id };
  }
  const existing = await admin
    .from("tool_executions")
    .select("id,status,output")
    .eq("organization_id", job.organization_id)
    .eq("idempotency_key", actionKey)
    .maybeSingle();
  if (existing.data?.status === "succeeded") return existing.data.output;
  const { data: execution, error: executionError } = await admin
    .from("tool_executions")
    .upsert(
      {
        organization_id: job.organization_id,
        ai_employee_id: employeeId,
        toolkit,
        tool_slug: toolSlug,
        status: "running",
        input: args,
        idempotency_key: actionKey,
        started_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,idempotency_key" },
    )
    .select("id")
    .single();
  if (executionError) throw executionError;
  const output = sanitizeToolOutput(
    await executeComposioTool({
      organizationId: job.organization_id,
      toolkit,
      toolSlug,
      arguments: args,
    }),
  );
  await admin
    .from("tool_executions")
    .update({
      status: "succeeded",
      output,
      completed_at: new Date().toISOString(),
    })
    .eq("id", execution.id);
  return output;
}

async function runEmployeeAction(
  admin: SupabaseClient,
  job: EmployeeJob,
  action: FlowAction,
) {
  const employeeId = String(action.employee_id ?? job.ai_employee_id ?? "");
  const { data: employee } = await admin
    .from("ai_employees")
    .select("id,name,status,instructions,knowledge_source_ids")
    .eq("id", employeeId)
    .eq("organization_id", job.organization_id)
    .single();
  if (employee?.status !== "active")
    throw new Error("AI employee is not active.");
  const sourceIds = Array.isArray(employee.knowledge_source_ids)
    ? employee.knowledge_source_ids
    : [];
  let query = admin
    .from("knowledge_articles")
    .select("title,body")
    .eq("organization_id", job.organization_id)
    .eq("status", "approved")
    .limit(20);
  if (sourceIds.length) query = query.in("source_id", sourceIds);
  const { data: articles } = await query;
  const prompt = String(
    action.prompt ?? job.input.message ?? "Run the configured task.",
  );
  return askArlo({
    workspace: "ResolveX workspace",
    context: (articles ?? [])
      .map((article) => `${article.title}\n${article.body}`)
      .join("\n\n---\n\n")
      .slice(0, 12_000),
    messages: [{ role: "user", content: prompt }],
    agentName: employee.name,
    instructions: employee.instructions,
  });
}

async function executeFlowJob(admin: SupabaseClient, job: EmployeeJob) {
  if (!job.automation_id) throw new Error("Flow job has no automation.");
  const { data: automation } = await admin
    .from("automations")
    .select("id,name,enabled,actions,run_count")
    .eq("id", job.automation_id)
    .eq("organization_id", job.organization_id)
    .single();
  if (!automation) throw new Error("Flow no longer exists.");
  const actions = (
    Array.isArray(automation.actions) ? automation.actions : []
  ) as FlowAction[];
  let index = Math.max(0, Number(job.state?.action_index ?? 0));
  let toolCalls = Number(job.tool_calls_used ?? 0);
  let spendMinor = Number(job.spend_minor ?? 0);
  const results = Array.isArray(job.state?.results)
    ? [...job.state.results]
    : [];
  for (; index < actions.length; index += 1) {
    const fresh = await admin
      .from("employee_jobs")
      .select("cancel_requested_at")
      .eq("id", job.id)
      .single();
    if (fresh.data?.cancel_requested_at) return { cancelled: true };
    const action = actions[index];
    const type = String(action.type ?? "");
    let output: unknown = null;
    if (type === "set_priority" || type === "add_tag") {
      const conversationId = String(job.input.conversation_id ?? "");
      if (!conversationId) throw new Error(`${type} requires a conversation.`);
      const { data: conversation } = await admin
        .from("conversations")
        .select("tags")
        .eq("id", conversationId)
        .eq("organization_id", job.organization_id)
        .single();
      const update: JsonRecord = {};
      if (type === "set_priority")
        update.priority = String(action.value ?? "normal");
      if (type === "add_tag") {
        const tags = Array.isArray(conversation?.tags)
          ? [...conversation.tags]
          : [];
        const tag = String(action.value ?? "").trim();
        if (tag && !tags.includes(tag)) tags.push(tag);
        update.tags = tags;
      }
      const { error } = await admin
        .from("conversations")
        .update(update)
        .eq("id", conversationId)
        .eq("organization_id", job.organization_id);
      if (error) throw error;
      output = update;
    } else if (type === "handoff") {
      const conversationId = String(job.input.conversation_id ?? "");
      if (!conversationId)
        throw new Error("Human handoff requires a conversation.");
      output = await createHumanHandoff({
        supabase: admin,
        organizationId: job.organization_id,
        conversationId,
        employeeId: job.ai_employee_id,
        source: "automation",
        reason: String(action.reason ?? "Flow requested human review"),
        summary: String(job.input.message ?? ""),
      });
    } else if (type === "create_task") {
      const { data, error } = await admin
        .from("tasks")
        .insert({
          organization_id: job.organization_id,
          conversation_id: job.input.conversation_id || null,
          title: String(action.title ?? action.value ?? "ResolveX follow-up"),
          priority: String(action.priority ?? "normal"),
          due_at: action.due_at || null,
          source: "automation",
          metadata: { employee_job_id: job.id, automation_id: automation.id },
        })
        .select("id")
        .single();
      if (error) throw error;
      output = data;
    } else if (type === "run_employee") {
      if (toolCalls >= job.max_tool_calls)
        throw new Error("Maximum action calls reached.");
      await reserveEmployeeAction(admin, job.organization_id);
      output = await runEmployeeAction(admin, job, action);
      spendMinor += Number(asRecord(output).costMinor ?? 0);
      if (spendMinor > job.max_spend_minor)
        throw new Error("Maximum AI spend for this job was reached.");
      toolCalls += 1;
    } else if (type === "composio_tool") {
      if (toolCalls >= job.max_tool_calls)
        throw new Error("Maximum tool calls reached.");
      await reserveEmployeeAction(admin, job.organization_id);
      output = await executeComposioAction(admin, job, action, index, results);
      if (asRecord(output).waitingApprovalId) {
        await admin
          .from("employee_jobs")
          .update({
            status: "waiting_approval",
            approval_id: asRecord(output).waitingApprovalId,
            state: { action_index: index, results },
            tool_calls_used: toolCalls,
            locked_at: null,
            locked_by: null,
          })
          .eq("id", job.id);
        if (job.workflow_run_id)
          await admin
            .from("workflow_runs")
            .update({ status: "waiting_approval" })
            .eq("id", job.workflow_run_id);
        return { waiting: true };
      }
      toolCalls += 1;
    } else {
      throw new Error(`Unsupported flow action: ${type || "empty"}.`);
    }
    results[index] = { type, output };
    await admin
      .from("employee_jobs")
      .update({
        state: { action_index: index + 1, results },
        tool_calls_used: toolCalls,
        spend_minor: spendMinor,
      })
      .eq("id", job.id);
  }
  await admin
    .from("automations")
    .update({
      run_count: Number(automation.run_count ?? 0) + 1,
      failure_count: 0,
    })
    .eq("id", automation.id);
  return { results };
}

async function finishJob(
  admin: SupabaseClient,
  job: EmployeeJob,
  output: JsonRecord,
) {
  const now = new Date().toISOString();
  await admin
    .from("employee_jobs")
    .update({
      status: "succeeded",
      output,
      completed_at: now,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id);
  if (job.workflow_run_id)
    await admin
      .from("workflow_runs")
      .update({ status: "succeeded", output, completed_at: now })
      .eq("id", job.workflow_run_id);
}

async function failJob(
  admin: SupabaseClient,
  job: EmployeeJob,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "Job failed.";
  const retry = job.attempt < job.max_attempts;
  const update = retry
    ? {
        status: "retrying",
        error: message,
        run_at: new Date(
          Date.now() + Math.min(300, 2 ** job.attempt * 10) * 1000,
        ).toISOString(),
        locked_at: null,
        locked_by: null,
      }
    : {
        status: "failed",
        error: message,
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
      };
  await admin.from("employee_jobs").update(update).eq("id", job.id);
  if (job.workflow_run_id)
    await admin
      .from("workflow_runs")
      .update({
        status: retry ? "queued" : "failed",
        error: message,
        attempt: job.attempt,
        next_retry_at: retry ? update.run_at : null,
        completed_at: retry ? null : new Date().toISOString(),
      })
      .eq("id", job.workflow_run_id);
  if (!retry && job.automation_id) {
    const { data: automation } = await admin
      .from("automations")
      .select("failure_count")
      .eq("id", job.automation_id)
      .maybeSingle();
    await admin
      .from("automations")
      .update({ failure_count: Number(automation?.failure_count ?? 0) + 1 })
      .eq("id", job.automation_id);
  }
}

export async function processEmployeeJobs(
  admin: SupabaseClient,
  options: { limit?: number; worker?: string } = {},
) {
  const worker = options.worker ?? `runtime-${crypto.randomUUID()}`;
  const { data, error } = await admin.rpc("claim_employee_jobs", {
    p_worker: worker,
    p_limit: options.limit ?? 10,
  });
  if (error) throw error;
  const jobs = (data ?? []) as EmployeeJob[];
  const outcomes: JsonRecord[] = [];
  for (const job of jobs) {
    try {
      if (job.cancel_requested_at) {
        await admin
          .from("employee_jobs")
          .update({
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        outcomes.push({ id: job.id, status: "cancelled" });
        continue;
      }
      let output: JsonRecord;
      if (job.job_type === "provider_reconciliation") {
        const executionId = String(job.input.execution_id ?? "");
        const execution = asRecord(await getBolnaExecution(executionId));
        const result = await reconcileBolnaExecution(admin, execution);
        if (!result.terminal && job.attempt < job.max_attempts)
          throw new Error("The telephone call is still in progress.");
        output = result;
      } else if (job.job_type === "flow") {
        output = asRecord(await executeFlowJob(admin, job));
        if (output.waiting || output.cancelled) {
          outcomes.push({ id: job.id, ...output });
          continue;
        }
      } else {
        throw new Error(`Unsupported job type: ${job.job_type}.`);
      }
      await finishJob(admin, job, output);
      outcomes.push({ id: job.id, status: "succeeded" });
    } catch (jobError) {
      await failJob(admin, job, jobError);
      outcomes.push({
        id: job.id,
        status: job.attempt < job.max_attempts ? "retrying" : "failed",
        error: jobError instanceof Error ? jobError.message : "Job failed.",
      });
    }
  }
  return outcomes;
}
