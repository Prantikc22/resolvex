import { NextResponse } from "next/server";
import { z } from "zod";
import { employeeTemplates } from "@/lib/ai/employee-templates";
import { hasWorkspaceAccess } from "@/lib/billing/access";
import {
  createElevenLabsAgent,
  updateElevenLabsAgent,
} from "@/lib/providers/elevenlabs";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({ confirmation: z.literal("ACTIVATE") });

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/ai-employees/[id]/activate">,
) {
  try {
    schema.parse(await request.json());
    const { id } = await params;
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can activate AI employees." },
        { status: 403 },
      );
    if (!(await hasWorkspaceAccess(supabase, organizationId)))
      return NextResponse.json(
        {
          error:
            "Activate a workspace subscription before provisioning providers.",
        },
        { status: 402 },
      );
    const { data: employee, error } = await supabase
      .from("ai_employees")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (error || !employee)
      return NextResponse.json(
        { error: "AI employee not found." },
        { status: 404 },
      );
    const wantsVoice = employee.assigned_channels?.includes("voice");
    if (!wantsVoice) {
      const { data, error: updateError } = await supabase
        .from("ai_employees")
        .update({ status: "active", last_error: null })
        .eq("id", id)
        .select()
        .single();
      if (updateError) throw updateError;
      return NextResponse.json({ employee: data, provisioned: false });
    }
    if (!process.env.ELEVENLABS_API_KEY)
      return NextResponse.json(
        { error: "ElevenLabs is not configured on the server." },
        { status: 503 },
      );
    await supabase
      .from("ai_employees")
      .update({ status: "provisioning", last_error: null })
      .eq("id", id);
    const template =
      employeeTemplates[
        employee.template_type as keyof typeof employeeTemplates
      ];
    const config = {
      name: employee.name,
      instructions: employee.instructions,
      greeting: template?.greeting ?? "Hi, I’m Arlo. How can I help?",
      language: employee.languages?.[0] ?? "en",
      voiceId: employee.voice_id,
    };
    let externalAgentId = employee.external_agent_id as string | null;
    try {
      if (externalAgentId) {
        await updateElevenLabsAgent(externalAgentId, config);
      } else {
        const created = await createElevenLabsAgent(config);
        externalAgentId = created.agent_id;
      }
      const { data, error: updateError } = await supabase
        .from("ai_employees")
        .update({
          status: "active",
          provider: "elevenlabs",
          external_agent_id: externalAgentId,
          provisioned_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select()
        .single();
      if (updateError) throw updateError;
      await supabase.from("audit_events").insert({
        organization_id: organizationId,
        actor_id: user.id,
        action: "ai_employee.activated",
        entity_type: "ai_employee",
        entity_id: id,
        metadata: {
          provider: "elevenlabs",
          external_agent_id: externalAgentId,
        },
      });
      return NextResponse.json({ employee: data, provisioned: true });
    } catch (providerError) {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Voice provisioning failed.";
      await supabase
        .from("ai_employees")
        .update({ status: "failed", last_error: message })
        .eq("id", id)
        .eq("organization_id", organizationId);
      throw providerError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed." },
      { status: 400 },
    );
  }
}
