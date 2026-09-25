import { NextResponse } from "next/server";
import { usageGuards } from "@/lib/pricing";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().default(""),
  trigger: z
    .enum([
      "new_message",
      "crm_lead_created",
      "new_contact",
      "email_received",
      "call_completed",
      "webhook",
      "schedule_once",
      "schedule_recurring",
    ])
    .default("new_message"),
  contains: z.string().trim().max(100).optional().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  tag: z.string().trim().max(40).optional().default(""),
  handoff: z.boolean().default(false),
  createTaskTitle: z.string().trim().max(160).optional().default(""),
  employeeId: z.string().uuid().optional(),
  employeePrompt: z.string().trim().max(2000).optional().default(""),
  toolkit: z.string().trim().max(80).optional().default(""),
  toolSlug: z.string().trim().max(200).optional().default(""),
  toolArguments: z.record(z.string(), z.unknown()).optional().default({}),
  scheduleAt: z.string().datetime().optional(),
  intervalMinutes: z
    .number()
    .int()
    .min(usageGuards.minFlowIntervalMinutes)
    .max(525_600)
    .optional(),
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
  const [{ data, error }, { data: runs, error: runsError }] = await Promise.all(
    [
      supabase
        .from("automations")
        .select(
          "id,name,description,enabled,trigger_config,actions,schedule_config,next_run_at,last_run_at,failure_count,run_count,created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("workflow_runs")
        .select(
          "id,automation_id,trigger_type,status,attempt,error,started_at,completed_at,created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
    ],
  );
  if (error || runsError)
    return NextResponse.json(
      { error: error?.message ?? runsError?.message },
      { status: 400 },
    );
  return NextResponse.json({ automations: data ?? [], runs: runs ?? [] });
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
      ...(input.trigger === "new_message"
        ? [{ type: "set_priority", value: input.priority }]
        : []),
      ...(input.tag ? [{ type: "add_tag", value: input.tag }] : []),
      ...(input.handoff ? [{ type: "handoff" }] : []),
      ...(input.createTaskTitle
        ? [{ type: "create_task", title: input.createTaskTitle }]
        : []),
      ...(input.employeeId
        ? [
            {
              type: "run_employee",
              employee_id: input.employeeId,
              prompt: input.employeePrompt || undefined,
            },
          ]
        : []),
      ...(input.employeeId && input.toolkit && input.toolSlug
        ? [
            {
              type: "composio_tool",
              employee_id: input.employeeId,
              toolkit: input.toolkit,
              tool_slug: input.toolSlug,
              arguments: input.toolArguments,
            },
          ]
        : []),
    ];
    if (!actions.length)
      return NextResponse.json(
        { error: "Add at least one THEN action." },
        { status: 422 },
      );
    if (input.trigger === "schedule_once" && !input.scheduleAt)
      return NextResponse.json(
        { error: "Choose when this one-time flow should run." },
        { status: 422 },
      );
    if (input.trigger === "schedule_recurring" && !input.intervalMinutes)
      return NextResponse.json(
        { error: "Choose a recurrence interval." },
        { status: 422 },
      );
    const firstRun =
      input.trigger === "schedule_once"
        ? input.scheduleAt
        : input.trigger === "schedule_recurring"
          ? new Date(
              Date.now() + Number(input.intervalMinutes) * 60_000,
            ).toISOString()
          : null;
    const { data, error } = await supabase
      .from("automations")
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        enabled: true,
        trigger_config: { event: input.trigger, contains: input.contains },
        actions,
        schedule_config:
          input.trigger === "schedule_recurring"
            ? { interval_minutes: input.intervalMinutes }
            : input.trigger === "schedule_once"
              ? { run_at: input.scheduleAt }
              : {},
        next_run_at: firstRun,
      })
      .select(
        "id,name,description,enabled,trigger_config,actions,schedule_config,next_run_at,last_run_at,failure_count,run_count,created_at",
      )
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
      .select(
        "id,name,description,enabled,trigger_config,actions,schedule_config,next_run_at,last_run_at,failure_count,run_count,created_at",
      )
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
