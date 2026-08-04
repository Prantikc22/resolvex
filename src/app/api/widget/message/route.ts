import { NextResponse } from "next/server";
import { z } from "zod";
import { askArlo } from "@/lib/ai/arlo";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  key: z.string().uuid(),
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id,name,widget_enabled")
      .eq("public_widget_key", input.key)
      .single();
    if (organizationError || !organization?.widget_enabled)
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 404 },
      );

    let { data: inbox } = await supabase
      .from("inboxes")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("channel", "chat")
      .limit(1)
      .maybeSingle();
    if (!inbox) {
      const created = await supabase
        .from("inboxes")
        .insert({
          organization_id: organization.id,
          name: "Website chat",
          channel: "chat",
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      inbox = created.data;
    }

    const externalId = `widget:${input.sessionId}`;
    let { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle();
    if (!contact) {
      const created = await supabase
        .from("contacts")
        .insert({
          organization_id: organization.id,
          name: "Website visitor",
          external_id: externalId,
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      contact = created.data;
    }

    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("organization_id", organization.id)
      .contains("metadata", { widget_session: input.sessionId })
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      const created = await supabase
        .from("conversations")
        .insert({
          organization_id: organization.id,
          inbox_id: inbox.id,
          contact_id: contact.id,
          subject: input.message.slice(0, 90),
          metadata: {
            widget_session: input.sessionId,
            source: "website_widget",
          },
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      conversation = created.data;
    }

    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .eq("sender_type", "contact")
      .gte("created_at", minuteAgo);
    if ((count ?? 0) >= 8)
      return NextResponse.json(
        { error: "Please wait a moment before sending another message." },
        { status: 429 },
      );

    await supabase
      .from("messages")
      .insert({
        organization_id: organization.id,
        conversation_id: conversation.id,
        sender_type: "contact",
        body: input.message,
      });

    const [{ data: articles }, { data: sources }, { data: history }] =
      await Promise.all([
        supabase
          .from("knowledge_articles")
          .select("title,body")
          .eq("organization_id", organization.id)
          .eq("status", "approved")
          .limit(20),
        supabase
          .from("knowledge_sources")
          .select("name,content")
          .eq("organization_id", organization.id)
          .eq("status", "ready")
          .limit(8),
        supabase
          .from("messages")
          .select("sender_type,body")
          .eq("conversation_id", conversation.id)
          .eq("is_internal", false)
          .order("created_at", { ascending: true })
          .limit(12),
      ]);
    const contextParts = [
      ...(articles ?? []).map((article) => `${article.title}\n${article.body}`),
      ...(sources ?? []).map((source) => `${source.name}\n${source.content}`),
    ];
    const approvedContext = contextParts.join("\n\n---\n\n").slice(0, 12000);
    const messages = (history ?? [])
      .filter(
        (item) => item.sender_type === "contact" || item.sender_type === "ai",
      )
      .map((item) => ({
        role:
          item.sender_type === "contact"
            ? ("user" as const)
            : ("assistant" as const),
        content: item.body,
      }));
    const result = await askArlo({
      workspace: organization.name,
      context:
        approvedContext ||
        "No approved knowledge is available. Offer a human handoff without answering factual questions.",
      messages,
    });

    await Promise.all([
      supabase
        .from("messages")
        .insert({
          organization_id: organization.id,
          conversation_id: conversation.id,
          sender_type: "ai",
          body: result.message,
          ai_metadata: {
            model: result.model,
            grounded: Boolean(approvedContext),
          },
        }),
      supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          ai_state: approvedContext ? "drafting" : "handed_off",
        })
        .eq("id", conversation.id),
      supabase
        .from("usage_events")
        .insert({
          organization_id: organization.id,
          event_type: "ai_reply",
          metadata: { conversation_id: conversation.id, model: result.model },
        }),
    ]);

    return NextResponse.json({
      message: result.message,
      source: approvedContext
        ? "Approved workspace knowledge"
        : "Human handoff recommended",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message failed." },
      { status: 400 },
    );
  }
}
