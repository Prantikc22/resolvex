import { after, NextResponse } from "next/server";
import { z } from "zod";
import { runEventAutomations, type ResolveXEvent } from "@/lib/automation/run";
import { processEmployeeJobs } from "@/lib/jobs/runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const contactSchema = z.object({
  type: z.literal("contact"),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  companyId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  lifecycleStage: z
    .enum([
      "subscriber",
      "lead",
      "marketing_qualified",
      "sales_qualified",
      "opportunity",
      "customer",
      "evangelist",
      "other",
    ])
    .default("lead"),
  leadScore: z.number().int().min(0).max(100).default(0),
  territory: z.string().trim().max(100).optional(),
  customFields: z.record(z.string(), z.unknown()).default({}),
});
const companySchema = z.object({
  type: z.literal("company"),
  name: z.string().trim().min(2).max(160),
  domain: z.string().trim().max(255).optional(),
  industry: z.string().trim().max(100).optional(),
});
const dealSchema = z.object({
  type: z.literal("deal"),
  title: z.string().trim().min(2).max(180),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  stage: z.string().trim().min(2).max(80).default("New"),
  amountMinor: z.number().int().min(0).max(10_000_000_000).default(0),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("USD"),
  probability: z.number().int().min(0).max(100).default(10),
  nextStep: z.string().trim().max(500).optional(),
  territory: z.string().trim().max(100).optional(),
});
const taskSchema = z.object({
  type: z.literal("task"),
  title: z.string().trim().min(2).max(240),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.string().datetime().optional(),
});
const noteSchema = z.object({
  type: z.literal("note"),
  contactId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(1).max(10000),
});
const activitySchema = z.object({
  type: z.literal("activity"),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  activityType: z.enum([
    "call",
    "email",
    "message",
    "note",
    "meeting",
    "task",
    "deal",
  ]),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().max(10000).optional(),
});
const sequenceSchema = z.object({
  type: z.literal("sequence"),
  name: z.string().trim().min(2).max(160),
  audienceStage: z.string().trim().min(2).max(80).default("lead"),
  templateSubject: z.string().trim().max(240).default(""),
  templateBody: z.string().trim().max(20000).default(""),
});
const createSchema = z.discriminatedUnion("type", [
  contactSchema,
  companySchema,
  dealSchema,
  taskSchema,
  noteSchema,
  activitySchema,
  sequenceSchema,
]);
const updateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("task"),
    id: z.string().uuid(),
    status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  }),
  z.object({
    type: z.literal("deal"),
    id: z.string().uuid(),
    stage: z.string().trim().min(2).max(80),
  }),
  z.object({
    type: z.literal("contact"),
    id: z.string().uuid(),
    lifecycleStage: z
      .enum([
        "subscriber",
        "lead",
        "marketing_qualified",
        "sales_qualified",
        "opportunity",
        "customer",
        "evangelist",
        "other",
      ])
      .optional(),
    leadScore: z.number().int().min(0).max(100).optional(),
    territory: z.string().trim().max(100).nullable().optional(),
  }),
  z.object({
    type: z.literal("sequence"),
    id: z.string().uuid(),
    status: z.enum(["draft", "active", "paused", "archived"]),
  }),
]);

function enqueueCrmEvent({
  organizationId,
  event,
  eventId,
  payload,
}: {
  organizationId: string;
  event: ResolveXEvent;
  eventId: string;
  payload: Record<string, unknown>;
}) {
  after(async () => {
    const admin = createAdminClient();
    await runEventAutomations({
      supabase: admin,
      organizationId,
      event,
      eventId,
      payload,
    });
    await processEmployeeJobs(admin, { limit: 20 });
  });
}

export async function GET(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const contactId = new URL(request.url).searchParams.get("contactId");
  const [
    contacts,
    companies,
    deals,
    tasks,
    activities,
    appointments,
    sequences,
    enrollments,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id,name,email,phone,company,company_id,tags,lifecycle_stage,lead_score,territory,custom_fields,created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("companies")
      .select("id,name,domain,industry,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("deals")
      .select(
        "id,contact_id,company_id,title,pipeline,stage,amount_minor,currency,expected_close_at,probability,next_step,territory,insights,created_at,updated_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("tasks")
      .select(
        "id,contact_id,conversation_id,deal_id,title,status,priority,due_at,source,created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(300),
    (() => {
      let query = supabase
        .from("activities")
        .select(
          "id,contact_id,company_id,deal_id,conversation_id,activity_type,title,summary,occurred_at,metadata",
        )
        .eq("organization_id", organizationId)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (contactId) query = query.eq("contact_id", contactId);
      return query;
    })(),
    supabase
      .from("appointments")
      .select(
        "id,contact_id,ai_employee_id,title,starts_at,ends_at,status,external_provider,created_at",
      )
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: false })
      .limit(300),
    supabase
      .from("sales_sequences")
      .select(
        "id,name,status,audience_stage,template_subject,template_body,steps,created_at,updated_at",
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("sequence_enrollments")
      .select(
        "id,sequence_id,contact_id,status,current_step,next_step_at,created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const error = [
    contacts,
    companies,
    deals,
    tasks,
    activities,
    appointments,
    sequences,
    enrollments,
  ].find((result) => result.error)?.error;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    contacts: contacts.data ?? [],
    companies: companies.data ?? [],
    deals: deals.data ?? [],
    tasks: tasks.data ?? [],
    activities: activities.data ?? [],
    appointments: appointments.data ?? [],
    sequences: sequences.data ?? [],
    enrollments: enrollments.data ?? [],
  });
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
    if (!new Set(["owner", "admin", "agent"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "A read-only member cannot create CRM records." },
        { status: 403 },
      );
    if (input.type === "contact") {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          organization_id: organizationId,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          company_id: input.companyId ?? null,
          tags: input.tags,
          lifecycle_stage: input.lifecycleStage,
          lead_score: input.leadScore,
          territory: input.territory || null,
          custom_fields: input.customFields,
        })
        .select(
          "id,name,email,phone,company_id,tags,lifecycle_stage,lead_score,territory,custom_fields,created_at",
        )
        .single();
      if (error) throw error;
      const identifiers = [
        ...(input.email
          ? [
              {
                organization_id: organizationId,
                contact_id: data.id,
                kind: "email",
                value: input.email.toLowerCase(),
                is_primary: true,
              },
            ]
          : []),
        ...(input.phone
          ? [
              {
                organization_id: organizationId,
                contact_id: data.id,
                kind: "phone",
                value: input.phone,
                is_primary: true,
              },
            ]
          : []),
      ];
      if (identifiers.length)
        await supabase.from("contact_identifiers").insert(identifiers);
      enqueueCrmEvent({
        organizationId,
        event: "new_contact",
        eventId: `contact:${data.id}`,
        payload: { contact_id: data.id, lifecycle_stage: input.lifecycleStage },
      });
      return NextResponse.json({ item: data }, { status: 201 });
    }
    if (input.type === "company") {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          organization_id: organizationId,
          name: input.name,
          domain: input.domain || null,
          industry: input.industry || null,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }
    if (input.type === "deal") {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          organization_id: organizationId,
          title: input.title,
          contact_id: input.contactId ?? null,
          company_id: input.companyId ?? null,
          stage: input.stage,
          amount_minor: input.amountMinor,
          currency: input.currency,
          owner_id: user.id,
          probability: input.probability,
          next_step: input.nextStep || null,
          territory: input.territory || null,
        })
        .select()
        .single();
      if (error) throw error;
      enqueueCrmEvent({
        organizationId,
        event: "crm_lead_created",
        eventId: `deal:${data.id}`,
        payload: { deal_id: data.id, stage: data.stage },
      });
      return NextResponse.json({ item: data }, { status: 201 });
    }
    if (input.type === "task") {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          organization_id: organizationId,
          title: input.title,
          contact_id: input.contactId ?? null,
          deal_id: input.dealId ?? null,
          priority: input.priority,
          due_at: input.dueAt ?? null,
          assignee_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }
    if (input.type === "sequence") {
      const { data, error } = await supabase
        .from("sales_sequences")
        .insert({
          organization_id: organizationId,
          name: input.name,
          audience_stage: input.audienceStage,
          template_subject: input.templateSubject,
          template_body: input.templateBody,
          steps: input.templateBody
            ? [{ order: 1, channel: "email", delay_hours: 0 }]
            : [],
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }
    if (input.type === "activity") {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          organization_id: organizationId,
          contact_id: input.contactId ?? null,
          deal_id: input.dealId ?? null,
          activity_type: input.activityType,
          title: input.title,
          summary: input.summary || null,
          actor_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.activityType === "meeting" || input.activityType === "call")
        enqueueCrmEvent({
          organizationId,
          event: "call_completed",
          eventId: `activity:${data.id}`,
          payload: {
            activity_id: data.id,
            activity_type: input.activityType,
            contact_id: input.contactId,
            deal_id: input.dealId,
          },
        });
      return NextResponse.json({ item: data }, { status: 201 });
    }
    const { data, error } = await supabase
      .from("activities")
      .insert({
        organization_id: organizationId,
        contact_id: input.contactId,
        activity_type: "note",
        title: input.title,
        summary: input.summary,
        actor_id: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create record.",
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
    if (!new Set(["owner", "admin", "agent"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "A read-only member cannot update CRM records." },
        { status: 403 },
      );
    const table =
      input.type === "task"
        ? "tasks"
        : input.type === "deal"
          ? "deals"
          : input.type === "contact"
            ? "contacts"
            : "sales_sequences";
    const update =
      input.type === "task"
        ? { status: input.status }
        : input.type === "deal"
          ? { stage: input.stage }
          : input.type === "contact"
            ? {
                ...(input.lifecycleStage
                  ? { lifecycle_stage: input.lifecycleStage }
                  : {}),
                ...(input.leadScore !== undefined
                  ? { lead_score: input.leadScore }
                  : {}),
                ...(input.territory !== undefined
                  ? { territory: input.territory }
                  : {}),
              }
            : { status: input.status };
    const { data, error } = await supabase
      .from(table)
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update record.",
      },
      { status: 400 },
    );
  }
}
