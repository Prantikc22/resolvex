import { NextResponse } from "next/server";
import { z } from "zod";
import { plivoConfigured, searchPlivoNumbers } from "@/lib/providers/plivo";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const searchSchema = z.object({
  country: z.string().regex(/^[A-Za-z]{2}$/),
  type: z.enum(["local", "tollfree", "mobile", "fixed"]).optional(),
});
const requestSchema = z.object({
  number: z.string().trim().min(5).max(30),
  country: z.string().regex(/^[A-Za-z]{2}$/),
  numberType: z.string().trim().max(30).optional(),
  monthlyCostMinor: z.number().int().min(0).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  providerMetadata: z.record(z.string(), z.unknown()).default({}),
  employeeId: z.string().uuid(),
  complianceApplicationId: z.string().trim().min(4).max(200).optional(),
  confirmation: z.literal("REQUEST ACTIVATION"),
});

export async function GET(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const url = new URL(request.url);
  const country = url.searchParams.get("country");
  if (!country) {
    const [{ data, error }, { data: employees }] = await Promise.all([
      supabase
        .from("phone_numbers")
        .select(
          "id,provider,e164,country,number_type,status,monthly_cost_minor,currency,assigned_employee_ids,compliance_status,created_at,updated_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_employees")
        .select("id,name,status,assigned_channels,external_agent_id")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .contains("assigned_channels", ["voice"]),
    ]);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      numbers: data ?? [],
      voiceEmployees: employees ?? [],
      configured: plivoConfigured(),
    });
  }
  if (!plivoConfigured())
    return NextResponse.json(
      { error: "Plivo is not configured." },
      { status: 503 },
    );
  try {
    const input = searchSchema.parse({
      country,
      type: url.searchParams.get("type") || undefined,
    });
    const preferredType =
      input.type ?? (input.country.toUpperCase() === "IN" ? "fixed" : "local");
    let result = await searchPlivoNumbers({ ...input, type: preferredType });
    let searchedTypes = [preferredType];
    if (
      input.country.toUpperCase() === "US" &&
      !input.type &&
      !(result.objects ?? []).length
    ) {
      result = await searchPlivoNumbers({ ...input, type: "tollfree" });
      searchedTypes = ["local", "tollfree"];
    }
    return NextResponse.json({
      available: (result.objects ?? []).map((item) => ({
        number: item.number,
        type: item.type ?? null,
        region: item.region ?? null,
        monthlyRentalRate: item.monthly_rental_rate ?? null,
        setupRate: item.setup_rate ?? null,
        currency: item.currency ?? null,
        restriction: item.restriction ?? null,
        restrictionText: item.restriction_text ?? null,
      })),
      searchedTypes,
      message:
        !(result.objects ?? []).length && input.country.toUpperCase() === "US"
          ? "Plivo returned no US local or toll-free inventory for this account. This is provider inventory/account eligibility, not a ResolveX filter."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Number search failed.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can request phone activation." },
        { status: 403 },
      );
    const india = input.country.toUpperCase() === "IN";
    if (india && !input.complianceApplicationId)
      return NextResponse.json(
        {
          error:
            "India numbers require an accepted Plivo compliance application ID before a purchase request can be created.",
        },
        { status: 422 },
      );
    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id,name,status,external_agent_id,assigned_channels")
      .eq("id", input.employeeId)
      .eq("organization_id", organizationId)
      .single();
    if (
      !employee?.external_agent_id ||
      employee.status !== "active" ||
      !employee.assigned_channels?.includes("voice")
    )
      return NextResponse.json(
        { error: "Select an active, provisioned voice AI employee." },
        { status: 409 },
      );
    const { data, error } = await supabase
      .from("phone_numbers")
      .upsert(
        {
          organization_id: organizationId,
          e164: input.number,
          country: input.country.toUpperCase(),
          number_type: input.numberType ?? null,
          status: india ? "pending_compliance" : "pending_authorization",
          compliance_status: india ? "pending" : "not_required",
          monthly_cost_minor: input.monthlyCostMinor ?? null,
          currency: input.currency ?? null,
          assigned_employee_ids: [employee.id],
          provider_metadata: {
            ...input.providerMetadata,
            ...(input.complianceApplicationId
              ? { compliance_application_id: input.complianceApplicationId }
              : {}),
            routing_strategy: india
              ? "plivo_india_resident"
              : "plivo_elevenlabs_sip",
          },
        },
        { onConflict: "organization_id,e164" },
      )
      .select()
      .single();
    if (error) throw error;
    await supabase.from("approval_requests").insert({
      organization_id: organizationId,
      requested_by: user.id,
      ai_employee_id: employee.id,
      action_type: "phone_number_purchase",
      title: `Activate ${input.number}`,
      risk: "high",
      payload: {
        phone_number_id: data.id,
        ai_employee_id: employee.id,
        provider: "plivo",
        note: india
          ? "Approval purchases this India number after its Plivo compliance application is accepted, then provisions Plivo SIP and ElevenLabs AI routing."
          : "Approval purchases this number, provisions a Plivo SIP trunk, and assigns it to the selected ElevenLabs AI employee.",
      },
    });
    return NextResponse.json({
      number: data,
      requiresCompliance: india,
      purchaseExecuted: false,
      message: india
        ? "Activation request saved. Approving it will purchase only after Plivo accepts the supplied India compliance application."
        : "Activation request saved. Approving it will immediately purchase and provision the number.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Activation request failed.",
      },
      { status: 400 },
    );
  }
}
