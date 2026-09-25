import { NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { bolnaConfigured } from "@/lib/providers/bolna";
import { encryptServerSecret } from "@/lib/security/secrets";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const connectSchema = z.object({
  action: z.literal("connect_sip"),
  number: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +14155550123."),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  provider: z.enum(["plivo", "twilio", "exotel", "vobiz", "vonage", "custom"]),
  employeeId: z.string().uuid(),
  gatewayAddress: z.string().trim().min(4).max(255),
  port: z.number().int().min(1).max(65535).default(5060),
  authType: z.enum(["userpass", "ip-based"]),
  authUsername: z.string().trim().max(255).optional(),
  authPassword: z.string().min(1).max(1000).optional(),
  ipIdentifiers: z.array(z.string().trim().min(3).max(80)).max(20).optional(),
  confirmation: z.literal("REQUEST ACTIVATION"),
});

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status,provider,current_period_end,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!subscriptionHasWorkspaceAccess(subscription))
    return NextResponse.json(
      { error: "An active subscription is required for telephone service." },
      { status: 402 },
    );

  const [{ data, error }, { data: employees }] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select(
        "id,provider,e164,country,number_type,status,assigned_employee_ids,created_at,updated_at",
      )
      .eq("organization_id", organizationId)
      .not("status", "eq", "released")
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_employees")
      .select("id,name,status,assigned_channels")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .contains("assigned_channels", ["phone"]),
  ]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    numbers: (data ?? []).map((number) => ({
      ...number,
      provider: number.provider === "bolna" ? "managed" : number.provider,
    })),
    voiceEmployees: employees ?? [],
    configured: bolnaConfigured(),
  });
}

export async function POST(request: Request) {
  try {
    const input = connectSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can connect phone numbers." },
        { status: 403 },
      );

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status,provider,current_period_end,metadata")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription))
      return NextResponse.json(
        { error: "An active subscription is required for telephone service." },
        { status: 402 },
      );
    if (
      input.authType === "userpass" &&
      (!input.authUsername || !input.authPassword)
    )
      return NextResponse.json(
        { error: "SIP username and password are required." },
        { status: 422 },
      );
    if (input.authType === "ip-based" && !input.ipIdentifiers?.length)
      return NextResponse.json(
        { error: "At least one allowed SIP IP/CIDR is required." },
        { status: 422 },
      );

    const [{ data: employee }, { data: telephoneAgent }] = await Promise.all([
      supabase
        .from("ai_employees")
        .select("id,name,status,assigned_channels")
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
        .maybeSingle(),
    ]);
    if (
      employee?.status !== "active" ||
      !employee.assigned_channels?.includes("phone") ||
      telephoneAgent?.status !== "active" ||
      !telephoneAgent.external_agent_id
    )
      return NextResponse.json(
        {
          error:
            "Activate a telephone-enabled AI employee before connecting a number.",
        },
        { status: 409 },
      );

    const { data: number, error } = await supabase
      .from("phone_numbers")
      .upsert(
        {
          organization_id: organizationId,
          provider: "bolna",
          e164: input.number,
          country: input.country,
          number_type: "sip",
          status: "pending_authorization",
          compliance_status: "not_required",
          monthly_cost_minor: null,
          currency: null,
          assigned_employee_ids: [employee.id],
          provider_metadata: {
            bolna_agent_id: telephoneAgent.external_agent_id,
            sip_provider: input.provider,
            gateway_address: input.gatewayAddress,
            port: input.port,
            auth_type: input.authType,
            auth_username: input.authUsername,
            ip_identifiers: input.ipIdentifiers,
            ownership_model: "customer_owned",
            routing_strategy: "managed_sip_connection",
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
      action_type: "managed_sip_connection",
      title: `Connect customer-owned number ${input.number}`,
      risk: "high",
      payload: {
        phone_number_id: number.id,
        ai_employee_id: employee.id,
        bolna_agent_id: telephoneAgent.external_agent_id,
        provider: "bolna",
        sip: {
          provider: input.provider,
          gatewayAddress: input.gatewayAddress,
          port: input.port,
          authType: input.authType,
          authUsername: input.authUsername,
          authPasswordEncrypted: input.authPassword
            ? encryptServerSecret(input.authPassword)
            : undefined,
          ipIdentifiers: input.ipIdentifiers,
        },
      },
    });

    return NextResponse.json({
      number,
      connectionExecuted: false,
      message:
        "Connection is awaiting owner approval. ResolveX will configure routing only; number ownership and carrier billing stay with you.",
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Check the connection details." },
        { status: 422 },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Connection request failed.",
      },
      { status: 400 },
    );
  }
}
