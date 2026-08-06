import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [
    sourcesResult,
    contactsResult,
    conversationsResult,
    messagesResult,
    usageResult,
    automationResult,
    integrationResult,
  ] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("id,status,page_count")
      .eq("organization_id", organizationId),
    supabase
      .from("contacts")
      .select("id,name,email,company,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("conversations")
      .select(
        "id,contact_id,status,priority,ai_state,created_at,last_message_at",
      )
      .eq("organization_id", organizationId)
      .order("last_message_at", { ascending: false })
      .limit(1000),
    supabase
      .from("messages")
      .select("id,conversation_id,sender_type,created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("usage_events")
      .select("event_type,quantity,created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("automations")
      .select("id,enabled", { count: "exact" })
      .eq("organization_id", organizationId),
    supabase
      .from("integrations")
      .select("id,status", { count: "exact" })
      .eq("organization_id", organizationId),
  ]);
  const error = [
    sourcesResult,
    contactsResult,
    conversationsResult,
    messagesResult,
    usageResult,
    automationResult,
    integrationResult,
  ].find((result) => result.error)?.error;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  const conversations = conversationsResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const usage = usageResult.data ?? [];
  const contactConversationCount = new Map<string, number>();
  for (const conversation of conversations) {
    if (conversation.contact_id)
      contactConversationCount.set(
        conversation.contact_id,
        (contactConversationCount.get(conversation.contact_id) ?? 0) + 1,
      );
  }
  const aiResolutions = usage
    .filter((event) => event.event_type === "ai_resolution")
    .reduce((total, event) => total + Number(event.quantity ?? 0), 0);
  const agentReplies = messages.filter(
    (message) => message.sender_type === "agent",
  ).length;
  const responseTimes: number[] = [];
  for (const conversation of conversations) {
    const thread = messages
      .filter((message) => message.conversation_id === conversation.id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    const firstContact = thread.find(
      (message) => message.sender_type === "contact",
    );
    const firstAnswer = firstContact
      ? thread.find(
          (message) =>
            message.sender_type !== "contact" &&
            new Date(message.created_at) >= new Date(firstContact.created_at),
        )
      : null;
    if (firstContact && firstAnswer)
      responseTimes.push(
        (new Date(firstAnswer.created_at).getTime() -
          new Date(firstContact.created_at).getTime()) /
          60_000,
      );
  }
  const firstResponseMinutes = responseTimes.length
    ? Math.round(
        responseTimes.reduce((sum, value) => sum + value, 0) /
          responseTimes.length,
      )
    : null;

  return NextResponse.json({
    knowledge: {
      approved: (sourcesResult.data ?? []).filter(
        (source) => source.status === "ready",
      ).length,
      pending: (sourcesResult.data ?? []).filter(
        (source) => source.status === "draft",
      ).length,
      pages: (sourcesResult.data ?? []).reduce(
        (sum, source) => sum + Number(source.page_count ?? 0),
        0,
      ),
    },
    customers: (contactsResult.data ?? []).map((contact) => ({
      ...contact,
      conversations: contactConversationCount.get(contact.id) ?? 0,
    })),
    metrics: {
      conversations: conversations.length,
      open: conversations.filter(
        (conversation) => !["resolved", "closed"].includes(conversation.status),
      ).length,
      resolved: conversations.filter(
        (conversation) => conversation.status === "resolved",
      ).length,
      aiResolutions,
      agentReplies,
      firstResponseMinutes,
    },
    automations: {
      total: automationResult.data?.length ?? 0,
      enabled: (automationResult.data ?? []).filter((item) => item.enabled)
        .length,
    },
    integrations: {
      total: integrationResult.data?.length ?? 0,
      connected: (integrationResult.data ?? []).filter(
        (item) => item.status === "connected",
      ).length,
    },
  });
}
