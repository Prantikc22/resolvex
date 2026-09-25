import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { voiceIncluded } from "@/lib/pricing";
import { deleteBolnaAgent } from "@/lib/providers/bolna";
import { deleteElevenLabsAgent } from "@/lib/providers/elevenlabs";

type ProviderAgent = {
  id: string;
  organization_id: string;
  provider: string;
  external_agent_id: string | null;
};

/**
 * Removes live voice and phone agents for workspaces whose subscription no
 * longer pays for voice. Inbound phone calls reach the provider directly, so
 * deleting the agent is the only way to guarantee no unbillable minutes.
 * Reactivating an AI employee recreates the agents and reattaches numbers.
 */
export async function suspendLapsedVoice(admin: SupabaseClient) {
  const { data: agents, error } = await admin
    .from("ai_provider_agents")
    .select("id,organization_id,provider,external_agent_id")
    .eq("status", "active")
    .in("provider", ["elevenlabs", "bolna"])
    .limit(500);
  if (error) throw error;
  const rows = (agents ?? []) as ProviderAgent[];
  if (!rows.length) return { suspended: 0 };

  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];
  const { data: subscriptions, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("organization_id,status,provider,metadata")
    .in("organization_id", organizationIds);
  if (subscriptionError) throw subscriptionError;
  const byOrganization = new Map(
    (subscriptions ?? []).map((row) => [row.organization_id, row]),
  );

  let suspended = 0;
  for (const agent of rows) {
    if (voiceIncluded(byOrganization.get(agent.organization_id))) continue;
    try {
      if (agent.external_agent_id) {
        if (agent.provider === "bolna")
          await deleteBolnaAgent(agent.external_agent_id);
        else await deleteElevenLabsAgent(agent.external_agent_id);
      }
    } catch (providerError) {
      // An agent already removed at the provider is the desired end state.
      console.error("Voice suspension provider cleanup", providerError);
    }
    const { error: updateError } = await admin
      .from("ai_provider_agents")
      .update({
        status: "paused",
        last_error: "Voice paused: no active paid subscription.",
      })
      .eq("id", agent.id);
    if (updateError) throw updateError;
    suspended += 1;
  }
  return { suspended };
}
