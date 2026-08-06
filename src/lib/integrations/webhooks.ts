import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendWorkspaceWebhooks({
  supabase,
  organizationId,
  event,
  data,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  event: "message.created" | "conversation.replied" | "conversation.resolved";
  data: Record<string, unknown>;
}) {
  const { data: integrations } = await supabase
    .from("integrations")
    .select("id,config")
    .eq("organization_id", organizationId)
    .eq("status", "connected")
    .like("provider", "webhook:%");
  await Promise.allSettled(
    (integrations ?? []).map(async (integration) => {
      const config = integration.config as {
        url?: string;
        events?: string[];
      } | null;
      if (!config?.url || !config.events?.includes(event)) return;
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ResolveX-Webhooks/1.0",
        },
        body: JSON.stringify({
          event,
          created_at: new Date().toISOString(),
          organization_id: organizationId,
          data,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    }),
  );
}
