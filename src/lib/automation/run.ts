import type { SupabaseClient } from "@supabase/supabase-js";

type StoredAction = { type?: string; value?: string };

export async function runMessageAutomations({
  supabase,
  organizationId,
  conversationId,
  message,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  conversationId: string;
  message: string;
}) {
  const { data: rules } = await supabase
    .from("automations")
    .select("id,trigger_config,actions,run_count")
    .eq("organization_id", organizationId)
    .eq("enabled", true);
  if (!rules?.length) return;
  const { data: conversation } = await supabase
    .from("conversations")
    .select("priority,tags,ai_state")
    .eq("id", conversationId)
    .single();
  if (!conversation) return;

  for (const rule of rules) {
    const contains =
      typeof rule.trigger_config?.contains === "string"
        ? rule.trigger_config.contains.trim().toLowerCase()
        : "";
    if (contains && !message.toLowerCase().includes(contains)) continue;
    const update: Record<string, unknown> = {};
    const tags = Array.isArray(conversation.tags) ? [...conversation.tags] : [];
    for (const action of (Array.isArray(rule.actions)
      ? rule.actions
      : []) as StoredAction[]) {
      if (action.type === "set_priority" && action.value)
        update.priority = action.value;
      if (
        action.type === "add_tag" &&
        action.value &&
        !tags.includes(action.value)
      )
        tags.push(action.value);
      if (action.type === "handoff") update.ai_state = "handed_off";
    }
    if (tags.length) update.tags = tags;
    if (Object.keys(update).length) {
      await supabase
        .from("conversations")
        .update(update)
        .eq("id", conversationId);
      await supabase
        .from("automations")
        .update({ run_count: Number(rule.run_count ?? 0) + 1 })
        .eq("id", rule.id);
    }
  }
}
