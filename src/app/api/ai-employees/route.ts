import { NextResponse } from "next/server";
import { voicePauseReason } from "@/lib/billing/voice-credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  employeeTemplateIds,
  employeeTemplates,
} from "@/lib/ai/employee-templates";
import { deleteElevenLabsAgent } from "@/lib/providers/elevenlabs";
import { deleteBolnaAgent } from "@/lib/providers/bolna";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const baseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  templateType: z.enum(employeeTemplateIds),
  description: z.string().trim().max(600).optional(),
  instructions: z.string().trim().min(20).max(12000).optional(),
  voiceId: z.string().trim().max(120).nullable().optional(),
  languages: z
    .array(z.string().trim().min(2).max(12))
    .min(1)
    .max(10)
    .optional(),
  knowledgeSourceIds: z.array(z.string().uuid()).max(100).optional(),
  connectedToolkits: z
    .array(z.string().trim().min(2).max(80))
    .max(30)
    .optional(),
  assignedChannels: z
    .array(z.enum(["chat", "email", "voice", "phone", "sms", "whatsapp"]))
    .min(1)
    .max(5)
    .optional(),
  workingHours: z.record(z.string(), z.unknown()).optional(),
  escalationRules: z.record(z.string(), z.unknown()).optional(),
  usageBudgetCents: z.number().int().min(0).max(1_000_000).optional(),
});

const updateSchema = baseSchema.partial().extend({
  id: z.string().uuid(),
  action: z.enum(["update", "pause", "archive", "test"]).default("update"),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
  confirmation: z.literal("DELETE"),
  deleteProviderResource: z.boolean().default(false),
});

function canManage(role: string | null) {
  return role === "owner" || role === "admin";
}

const selection =
  "id,name,template_type,description,instructions,status,voice_id,languages,knowledge_source_ids,connected_toolkits,assigned_channels,working_hours,escalation_rules,usage_budget_cents,provider,external_agent_id,provisioned_at,last_error,created_at,updated_at";

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("ai_employees")
    .select(selection)
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  // Voice agents are paused when the plan or prepaid minutes lapse; surface
  // that per employee so the UI never offers a test that will be refused.
  const [{ data: agents }, { data: subscription }] = await Promise.all([
    supabase
      .from("ai_provider_agents")
      .select("ai_employee_id,channel,status")
      .eq("organization_id", organizationId),
    supabase
      .from("subscriptions")
      .select("status,provider,metadata")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  // Explain the current reason, not whatever was true when voice paused.
  const pausedReason = (agents ?? []).some((row) => row.status === "paused")
    ? await voicePauseReason(createAdminClient(), organizationId, subscription)
    : null;
  const employees = (data ?? []).map((employee) => {
    const web = (agents ?? []).find(
      (row) =>
        row.ai_employee_id === employee.id && row.channel === "website_voice",
    );
    return {
      ...employee,
      voice_status: web?.status ?? null,
      voice_note: web?.status === "paused" ? pausedReason : null,
    };
  });
  return NextResponse.json({
    employees,
    templates: employeeTemplates,
  });
}

export async function POST(request: Request) {
  try {
    const input = baseSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!canManage(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can create AI employees." },
        { status: 403 },
      );
    const template = employeeTemplates[input.templateType];
    const { data, error } = await supabase
      .from("ai_employees")
      .insert({
        organization_id: organizationId,
        created_by: user.id,
        name: input.name,
        template_type: input.templateType,
        description: input.description ?? template.description,
        instructions: input.instructions ?? template.instructions,
        voice_id: input.voiceId ?? null,
        languages: input.languages ?? ["en"],
        knowledge_source_ids: input.knowledgeSourceIds ?? [],
        connected_toolkits: input.connectedToolkits ?? [],
        assigned_channels: input.assignedChannels ?? template.channels,
        working_hours: input.workingHours ?? { timezone: "UTC", schedule: [] },
        escalation_rules: input.escalationRules ?? { always_allow_human: true },
        usage_budget_cents: input.usageBudgetCents ?? 2500,
      })
      .select(selection)
      .single();
    if (error) throw error;
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "ai_employee.created",
      entity_type: "ai_employee",
      entity_id: data.id,
      metadata: { template_type: input.templateType },
    });
    return NextResponse.json({ employee: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create employee.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const input = updateSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!canManage(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can update AI employees." },
        { status: 403 },
      );
    const update: Record<string, unknown> = {};
    if (input.action !== "update") {
      update.status =
        input.action === "pause"
          ? "paused"
          : input.action === "archive"
            ? "archived"
            : "testing";
    }
    const mappings: Array<[keyof typeof input, string]> = [
      ["name", "name"],
      ["templateType", "template_type"],
      ["description", "description"],
      ["instructions", "instructions"],
      ["voiceId", "voice_id"],
      ["languages", "languages"],
      ["knowledgeSourceIds", "knowledge_source_ids"],
      ["connectedToolkits", "connected_toolkits"],
      ["assignedChannels", "assigned_channels"],
      ["workingHours", "working_hours"],
      ["escalationRules", "escalation_rules"],
      ["usageBudgetCents", "usage_budget_cents"],
    ];
    for (const [source, target] of mappings) {
      if (input[source] !== undefined) update[target] = input[source];
    }
    const { data, error } = await supabase
      .from("ai_employees")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select(selection)
      .single();
    if (error) throw error;
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: `ai_employee.${input.action}`,
      entity_type: "ai_employee",
      entity_id: input.id,
      metadata: {},
    });
    return NextResponse.json({ employee: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update employee.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const input = deleteSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!canManage(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can delete AI employees." },
        { status: 403 },
      );
    const [{ data: employee, error: readError }, { data: providerAgents }] =
      await Promise.all([
        supabase
          .from("ai_employees")
          .select("id,external_agent_id,provider")
          .eq("id", input.id)
          .eq("organization_id", organizationId)
          .single(),
        supabase
          .from("ai_provider_agents")
          .select("provider,external_agent_id")
          .eq("ai_employee_id", input.id)
          .eq("organization_id", organizationId),
      ]);
    if (readError) throw readError;
    if (input.deleteProviderResource) {
      const resources = providerAgents?.length
        ? providerAgents
        : employee.external_agent_id && employee.provider
          ? [employee]
          : [];
      await Promise.all(
        resources.map((resource) => {
          if (resource.provider === "elevenlabs")
            return deleteElevenLabsAgent(resource.external_agent_id);
          if (resource.provider === "bolna")
            return deleteBolnaAgent(resource.external_agent_id);
          return Promise.resolve();
        }),
      );
    }
    const { error } = await supabase
      .from("ai_employees")
      .delete()
      .eq("id", input.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "ai_employee.deleted",
      entity_type: "ai_employee",
      entity_id: input.id,
      metadata: { provider_resource_deleted: input.deleteProviderResource },
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not delete employee.",
      },
      { status: 400 },
    );
  }
}
