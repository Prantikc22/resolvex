import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const contactSchema = z.object({
  type: z.literal("contact"),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  companyId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
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
const createSchema = z.discriminatedUnion("type", [
  contactSchema,
  companySchema,
  dealSchema,
  taskSchema,
  noteSchema,
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
]);

export async function GET(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const contactId = new URL(request.url).searchParams.get("contactId");
  const [contacts, companies, deals, tasks, activities, appointments] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id,name,email,phone,company,company_id,tags,created_at")
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
          "id,contact_id,company_id,title,pipeline,stage,amount_minor,currency,expected_close_at,created_at",
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
    ]);
  const error = [
    contacts,
    companies,
    deals,
    tasks,
    activities,
    appointments,
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
        })
        .select("id,name,email,phone,company_id,tags,created_at")
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
        })
        .select()
        .single();
      if (error) throw error;
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
    const table = input.type === "task" ? "tasks" : "deals";
    const update =
      input.type === "task" ? { status: input.status } : { stage: input.stage };
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
