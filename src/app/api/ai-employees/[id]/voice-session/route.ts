import { NextResponse } from "next/server";
import { createSignedConversationUrl } from "@/lib/providers/elevenlabs";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/ai-employees/[id]/voice-session">,
) {
  try {
    const { id } = await params;
    const { supabase, user, organizationId } = await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id,status,external_agent_id,provider,usage_budget_cents")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    const { data: providerAgent } = await supabase
      .from("ai_provider_agents")
      .select("external_agent_id,status")
      .eq("organization_id", organizationId)
      .eq("ai_employee_id", id)
      .eq("provider", "elevenlabs")
      .eq("channel", "website_voice")
      .maybeSingle();
    const externalAgentId =
      providerAgent?.external_agent_id ??
      (employee?.provider === "elevenlabs" ? employee.external_agent_id : null);
    if (
      !externalAgentId ||
      employee?.status !== "active" ||
      (providerAgent && providerAgent.status !== "active")
    )
      return NextResponse.json(
        { error: "Activate this voice employee before starting a test." },
        { status: 409 },
      );
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: spend } = await supabase
      .from("credit_transactions")
      .select("monetary_amount_minor")
      .eq("organization_id", organizationId)
      .eq("category", "voice")
      .gte("created_at", monthStart.toISOString());
    const used = (spend ?? []).reduce(
      (total, row) =>
        total + Math.max(0, Number(row.monetary_amount_minor ?? 0)),
      0,
    );
    if (used >= employee.usage_budget_cents)
      return NextResponse.json(
        { error: "This employee’s monthly voice budget has been reached." },
        { status: 402 },
      );
    const result = await createSignedConversationUrl(externalAgentId);
    await supabase.from("usage_events").insert({
      organization_id: organizationId,
      event_type: "voice_session_started",
      quantity: 1,
      metadata: { ai_employee_id: id, source: "website_test" },
    });
    return NextResponse.json({ signedUrl: result.signed_url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not start voice.",
      },
      { status: 400 },
    );
  }
}
