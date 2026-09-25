import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolveXEvent =
  | "crm_lead_created"
  | "new_contact"
  | "email_received"
  | "call_completed"
  | "webhook";

export async function runEventAutomations({
  supabase,
  organizationId,
  event,
  eventId,
  payload,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  event: ResolveXEvent;
  eventId: string;
  payload: Record<string, unknown>;
}) {
  const { data: flows, error } = await supabase
    .from("automations")
    .select("id,actions")
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .contains("trigger_config", { event });
  if (error) throw error;
  const jobs: string[] = [];
  for (const flow of flows ?? []) {
    const idempotencyKey = `flow:${flow.id}:event:${eventId}`;
    const input = { event_id: eventId, ...payload };
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .upsert(
        {
          organization_id: organizationId,
          automation_id: flow.id,
          trigger_type: event,
          status: "queued",
          input,
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
    if (!run) continue;
    const employeeAction = (
      Array.isArray(flow.actions) ? flow.actions : []
    ).find(
      (action) =>
        action?.type === "run_employee" || action?.type === "composio_tool",
    );
    const { data: job, error: jobError } = await supabase
      .from("employee_jobs")
      .upsert(
        {
          organization_id: organizationId,
          ai_employee_id: employeeAction?.employee_id ?? null,
          automation_id: flow.id,
          workflow_run_id: run.id,
          job_type: "flow",
          trigger_type: event,
          status: "queued",
          idempotency_key: idempotencyKey,
          input,
          max_attempts: 5,
          timeout_seconds: 90,
          max_tool_calls: 5,
          max_spend_minor: 100,
        },
        { onConflict: "organization_id,idempotency_key" },
      )
      .select("id")
      .single();
    if (jobError) throw jobError;
    jobs.push(job.id);
  }
  return jobs;
}

export async function runMessageAutomations({
  supabase,
  organizationId,
  conversationId,
  message,
  eventId,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  conversationId: string;
  message: string;
  eventId?: string;
}) {
  const { data: rules, error } = await supabase
    .from("automations")
    .select("id,trigger_config")
    .eq("organization_id", organizationId)
    .eq("enabled", true);
  if (error) throw error;
  const queued: string[] = [];
  for (const rule of rules ?? []) {
    const event = String(rule.trigger_config?.event ?? "new_message");
    if (event !== "new_message") continue;
    const contains =
      typeof rule.trigger_config?.contains === "string"
        ? rule.trigger_config.contains.trim().toLowerCase()
        : "";
    if (contains && !message.toLowerCase().includes(contains)) continue;
    const sourceKey =
      eventId ??
      crypto
        .createHash("sha256")
        .update(`${conversationId}:${message}`)
        .digest("hex")
        .slice(0, 24);
    const idempotencyKey = `flow:${rule.id}:message:${sourceKey}`;
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .upsert(
        {
          organization_id: organizationId,
          automation_id: rule.id,
          trigger_type: "new_message",
          status: "queued",
          input: {
            conversation_id: conversationId,
            message,
            event_id: eventId,
          },
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
    if (!run) continue;
    const { error: jobError } = await supabase.from("employee_jobs").upsert(
      {
        organization_id: organizationId,
        automation_id: rule.id,
        workflow_run_id: run.id,
        job_type: "flow",
        trigger_type: "new_message",
        status: "queued",
        idempotency_key: idempotencyKey,
        input: { conversation_id: conversationId, message, event_id: eventId },
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
    queued.push(run.id);
  }
  return queued;
}
