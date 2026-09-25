import { after, NextResponse } from "next/server";
import { z } from "zod";
import { askArlo } from "@/lib/ai/arlo";
import { runMessageAutomations } from "@/lib/automation/run";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { createHumanHandoff } from "@/lib/handoff";
import { sendWorkspaceWebhooks } from "@/lib/integrations/webhooks";
import { processEmployeeJobs } from "@/lib/jobs/runner";
import { classifyCustomerSignal, jevConfigured } from "@/lib/providers/jev";
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
      .select("id,name,widget_enabled,settings")
      .eq("public_widget_key", input.key)
      .single();
    if (organizationError || !organization?.widget_enabled)
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 404 },
      );
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status,provider,current_period_end,metadata")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription)) {
      return NextResponse.json(
        { error: "This messenger is no longer active." },
        { status: 402 },
      );
    }

    const { data: employee } = await supabase
      .from("ai_employees")
      .select(
        "id,name,instructions,knowledge_source_ids,connected_toolkits,assigned_channels",
      )
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .contains("assigned_channels", ["chat"])
      .order("provisioned_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!employee)
      return NextResponse.json(
        { error: "No active chat employee is assigned to this messenger." },
        { status: 409 },
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
      .select("id,ai_state,tags,metadata,priority")
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
            ai_employee_id: employee.id,
          },
        })
        .select("id,ai_state,tags,metadata,priority")
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

    const { data: incoming, error: incomingError } = await supabase
      .from("messages")
      .insert({
        organization_id: organization.id,
        conversation_id: conversation.id,
        sender_type: "contact",
        body: input.message,
      })
      .select("id")
      .single();
    if (incomingError) throw incomingError;

    if (jevConfigured()) {
      const currentConversation = conversation;
      after(async () => {
        try {
          const decision = await classifyCustomerSignal({
            channel: "website_chat",
            message: input.message,
          });
          const nextPriority =
            decision.urgencyScore >= 2.4 ||
            decision.needsHumanProbability >= 0.75
              ? "urgent"
              : decision.urgencyScore >= 1.5
                ? "high"
                : currentConversation.priority;
          await createAdminClient()
            .from("conversations")
            .update({
              priority: nextPriority,
              tags: [
                ...new Set([
                  ...(currentConversation.tags ?? []),
                  `intent:${decision.intent}`,
                ]),
              ],
              metadata: {
                ...(currentConversation.metadata ?? {}),
                decision: {
                  intent: decision.intent,
                  confidence: decision.confidence,
                  urgency_score: decision.urgencyScore,
                  needs_human_probability: decision.needsHumanProbability,
                },
              },
            })
            .eq("id", currentConversation.id)
            .eq("organization_id", organization.id);
        } catch {
          // Decision enrichment is advisory and must never block a customer reply.
        }
      });
    }

    const explicitHandoff =
      /\b(human|person|agent|representative|manager|supervisor|someone real|call me|callback)\b/i.test(
        input.message,
      );
    if (explicitHandoff || conversation.ai_state === "handed_off") {
      const result = await createHumanHandoff({
        supabase,
        organizationId: organization.id,
        conversationId: conversation.id,
        employeeId: employee.id,
        source: "website_chat",
        reason: explicitHandoff
          ? "Visitor explicitly requested a human"
          : "Follow-up message on an active human handoff",
        summary: input.message,
      });
      const reply = result.duplicate
        ? "Your message has been added to the existing handoff. A teammate can see the full conversation in the ResolveX inbox."
        : "I’ve placed this conversation in the team queue with the context attached. A teammate can accept it from the ResolveX inbox.";
      await supabase.from("messages").insert({
        organization_id: organization.id,
        conversation_id: conversation.id,
        sender_type: "ai",
        body: reply,
        ai_metadata: {
          model: "human-handoff",
          grounded: false,
          ai_employee_id: employee.id,
          handoff_id: result.handoff.id,
        },
      });
      return NextResponse.json({
        message: reply,
        source: "Human handoff queued",
        handoff: { id: result.handoff.id, status: result.handoff.status },
      });
    }

    await runMessageAutomations({
      supabase,
      organizationId: organization.id,
      conversationId: conversation.id,
      message: input.message,
      eventId: incoming.id,
    });
    after(async () => {
      await processEmployeeJobs(createAdminClient(), { limit: 10 });
    });
    await sendWorkspaceWebhooks({
      supabase,
      organizationId: organization.id,
      event: "message.created",
      data: { conversation_id: conversation.id, message: input.message },
    });

    const selectedSources = Array.isArray(employee.knowledge_source_ids)
      ? employee.knowledge_source_ids
      : [];
    let articleQuery = supabase
      .from("knowledge_articles")
      .select("title,body")
      .eq("organization_id", organization.id)
      .eq("status", "approved")
      .limit(20);
    let sourceQuery = supabase
      .from("knowledge_sources")
      .select("name,content")
      .eq("organization_id", organization.id)
      .eq("status", "ready")
      .limit(8);
    if (selectedSources.length) {
      articleQuery = articleQuery.in("source_id", selectedSources);
      sourceQuery = sourceQuery.in("id", selectedSources);
    }
    const [{ data: articles }, { data: sources }, { data: history }] =
      await Promise.all([
        articleQuery,
        sourceQuery,
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
    const aiReplies = (history ?? []).filter(
      (item) => item.sender_type === "ai",
    ).length;
    let allowanceAvailable = false;
    if (approvedContext && aiReplies < 5) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { data: reserved, error: reservationError } = await supabase.rpc(
        "reserve_ai_allowance",
        {
          p_organization_id: organization.id,
          p_conversation_id: conversation.id,
          p_period_start: monthStart.toISOString(),
          p_period_key: monthStart.toISOString().slice(0, 7),
          p_limit: 50,
        },
      );
      if (reservationError) throw reservationError;
      allowanceAvailable = reserved === true;
    }
    const handoffMessage = !approvedContext
      ? "I don’t have an approved source for that yet. I’ve handed this to a teammate who can help."
      : aiReplies >= 5
        ? "I’m handing this conversation to a teammate so you get a careful answer."
        : "This workspace has used its included AI allowance for the month. A teammate will reply instead.";
    const result = allowanceAvailable
      ? await askArlo({
          workspace: organization.name,
          context: approvedContext,
          messages,
          agentName:
            typeof organization.settings?.widget_agent_name === "string"
              ? organization.settings.widget_agent_name
              : employee.name,
          instructions: employee.instructions,
        })
      : { message: handoffMessage, model: "human-handoff" };

    const automaticHandoff = allowanceAvailable
      ? null
      : await createHumanHandoff({
          supabase,
          organizationId: organization.id,
          conversationId: conversation.id,
          employeeId: employee.id,
          source: "website_chat",
          reason: !approvedContext
            ? "No approved knowledge matched the visitor request"
            : aiReplies >= 5
              ? "AI reply limit reached"
              : "Workspace AI allowance exhausted",
          summary: input.message,
        });

    await Promise.all([
      supabase.from("messages").insert({
        organization_id: organization.id,
        conversation_id: conversation.id,
        sender_type: "ai",
        body: result.message,
        ai_metadata: {
          model: result.model,
          grounded: allowanceAvailable,
          ai_employee_id: employee.id,
          ...(automaticHandoff
            ? { handoff_id: automaticHandoff.handoff.id }
            : {}),
        },
      }),
      supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          ai_state: allowanceAvailable ? "drafting" : "handed_off",
        })
        .eq("id", conversation.id),
      allowanceAvailable
        ? supabase.from("usage_events").insert({
            organization_id: organization.id,
            event_type: "ai_reply",
            metadata: { conversation_id: conversation.id, model: result.model },
          })
        : Promise.resolve({ error: null }),
    ]);

    return NextResponse.json({
      message: result.message,
      source: allowanceAvailable
        ? `${employee.name} · approved workspace knowledge`
        : "Human handoff recommended",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message failed." },
      { status: 400 },
    );
  }
}
