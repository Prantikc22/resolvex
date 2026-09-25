import { NextResponse } from "next/server";
import { z } from "zod";
import { employeeTemplates } from "@/lib/ai/employee-templates";
import { hasWorkspaceAccess } from "@/lib/billing/access";
import { voiceBalance } from "@/lib/billing/voice-credits";
import { voiceIncluded, voiceLimits } from "@/lib/pricing";
import {
  assignBolnaInboundAgent,
  bolnaConfigured,
  createBolnaAgent,
  updateBolnaAgent,
} from "@/lib/providers/bolna";
import {
  createElevenLabsAgent,
  updateElevenLabsAgent,
} from "@/lib/providers/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({ confirmation: z.literal("ACTIVATE") });

type ProviderName = "elevenlabs" | "bolna";
type ChannelName = "website_voice" | "telephone";

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

    // Free trials run Arlo on text channels only; voice and phone providers
    // are provisioned once the subscription is paid.
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status,provider,metadata")
      .eq("organization_id", organizationId)
      .maybeSingle();
    const voiceMinutes = await voiceBalance(
      createAdminClient(),
      organizationId,
    );
    const voiceAllowed =
      voiceIncluded(subscription) &&
      voiceMinutes >= voiceLimits.suspendBelowMinutes;
    const deferredChannels = voiceAllowed
      ? []
      : (employee.assigned_channels ?? []).filter((channel: string) =>
          ["voice", "phone"].includes(channel),
        );
    const wantsWebsiteVoice =
      voiceAllowed && employee.assigned_channels?.includes("voice");
    const wantsTelephone =
      voiceAllowed && employee.assigned_channels?.includes("phone");
    if (wantsWebsiteVoice && !process.env.ELEVENLABS_API_KEY)
      return NextResponse.json(
        { error: "ElevenLabs website voice is not configured on the server." },
        { status: 503 },
      );
    if (wantsTelephone && !bolnaConfigured())
      return NextResponse.json(
        { error: "Telephone calling is not configured on the server." },
        { status: 503 },
      );

    await supabase
      .from("ai_employees")
      .update({ status: "provisioning", last_error: null })
      .eq("id", id)
      .eq("organization_id", organizationId);

    const admin = createAdminClient();
    const { data: existingProviders } = await admin
      .from("ai_provider_agents")
      .select("provider,channel,external_agent_id,status")
      .eq("organization_id", organizationId)
      .eq("ai_employee_id", id);
    const template =
      employeeTemplates[
        employee.template_type as keyof typeof employeeTemplates
      ];
    const baseConfig = {
      name: employee.name,
      instructions: employee.instructions,
      greeting: template?.greeting ?? "Hi, I’m Arlo. How can I help?",
      language: employee.languages?.[0] ?? "en",
      transferToNumber:
        typeof employee.escalation_rules?.transfer_to_number === "string"
          ? employee.escalation_rules.transfer_to_number
          : null,
    };
    const provisioned: Array<{
      provider: ProviderName;
      channel: ChannelName;
      externalAgentId: string;
    }> = [];

    try {
      if (wantsWebsiteVoice) {
        const current = existingProviders?.find(
          (row) =>
            row.provider === "elevenlabs" &&
            row.channel === "website_voice" &&
            row.status === "active",
        );
        let externalAgentId = current?.external_agent_id as string | undefined;
        if (externalAgentId) {
          await updateElevenLabsAgent(externalAgentId, {
            ...baseConfig,
            voiceId: employee.voice_id,
          });
        } else {
          const created = await createElevenLabsAgent({
            ...baseConfig,
            voiceId: employee.voice_id,
          });
          externalAgentId = created.agent_id;
        }
        await admin.from("ai_provider_agents").upsert(
          {
            organization_id: organizationId,
            ai_employee_id: id,
            provider: "elevenlabs",
            channel: "website_voice",
            external_agent_id: externalAgentId,
            status: "active",
            config: { language: baseConfig.language },
            last_error: null,
            provisioned_at: new Date().toISOString(),
          },
          {
            onConflict: "organization_id,ai_employee_id,provider,channel",
          },
        );
        provisioned.push({
          provider: "elevenlabs",
          channel: "website_voice",
          externalAgentId,
        });
      }

      if (wantsTelephone) {
        const current = existingProviders?.find(
          (row) =>
            row.provider === "bolna" &&
            row.channel === "telephone" &&
            row.status === "active",
        );
        let externalAgentId = current?.external_agent_id as string | undefined;
        if (externalAgentId) {
          await updateBolnaAgent(externalAgentId, baseConfig);
        } else {
          const created = await createBolnaAgent(baseConfig);
          externalAgentId = created.agent_id;
        }
        await admin.from("ai_provider_agents").upsert(
          {
            organization_id: organizationId,
            ai_employee_id: id,
            provider: "bolna",
            channel: "telephone",
            external_agent_id: externalAgentId,
            status: "active",
            config: {
              language: baseConfig.language,
              telephony_region: "IN",
              handoff_supported: Boolean(baseConfig.transferToNumber),
            },
            last_error: null,
            provisioned_at: new Date().toISOString(),
          },
          {
            onConflict: "organization_id,ai_employee_id,provider,channel",
          },
        );
        provisioned.push({
          provider: "bolna",
          channel: "telephone",
          externalAgentId,
        });
        // Numbers stay connected to the workspace while voice is paused;
        // point them at the recreated agent so inbound calls resume.
        const { data: numbers } = await admin
          .from("phone_numbers")
          .select("id,external_id,provider_metadata")
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .contains("assigned_employee_ids", [id])
          .not("external_id", "is", null);
        for (const number of numbers ?? []) {
          if (number.provider_metadata?.bolna_agent_id === externalAgentId)
            continue;
          await assignBolnaInboundAgent({
            agentId: externalAgentId,
            phoneNumberId: number.external_id,
          });
          await admin
            .from("phone_numbers")
            .update({
              provider_metadata: {
                ...(number.provider_metadata ?? {}),
                bolna_agent_id: externalAgentId,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", number.id);
        }
      }

      const legacyProvider =
        provisioned.find((item) => item.provider === "elevenlabs") ??
        provisioned[0];
      const { data, error: updateError } = await supabase
        .from("ai_employees")
        .update({
          status: "active",
          provider: legacyProvider?.provider ?? null,
          external_agent_id: legacyProvider?.externalAgentId ?? null,
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
          providers: provisioned.map(({ provider, channel }) => ({
            provider,
            channel,
          })),
          execution_modes: ["reactive", "scheduled", "event_driven"],
        },
      });
      return NextResponse.json({
        employee: data,
        provisioned: provisioned.length > 0,
        providers: provisioned.map(({ provider, channel }) => ({
          provider,
          channel,
        })),
        deferredChannels,
        deferredReason: deferredChannels.length
          ? voiceIncluded(subscription)
            ? `Add a voice pack under Billing (at least ${voiceLimits.suspendBelowMinutes} minutes), then activate again to switch on voice and phone.`
            : "Voice and phone switch on with an active paid plan. Activate again once it starts."
          : null,
      });
    } catch (providerError) {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Provider provisioning failed.";
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
