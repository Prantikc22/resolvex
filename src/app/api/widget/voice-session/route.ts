import { NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { voiceSpendCeilingMinor } from "@/lib/pricing";
import { createSignedConversationUrl } from "@/lib/providers/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  key: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const admin = createAdminClient();
    const { data: organization } = await admin
      .from("organizations")
      .select("id,widget_enabled,settings")
      .eq("public_widget_key", input.key)
      .single();
    if (!organization?.widget_enabled)
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 404 },
      );
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("status,provider,current_period_end,metadata")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription))
      return NextResponse.json(
        { error: "This messenger is no longer active." },
        { status: 402 },
      );
    const settings = (organization.settings ?? {}) as Record<string, unknown>;
    if (settings.website_voice_enabled !== true)
      return NextResponse.json(
        { error: "Website voice is disabled for this workspace." },
        { status: 409 },
      );
    const { data: employee } = await admin
      .from("ai_employees")
      .select("id,status,usage_budget_cents")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .contains("assigned_channels", ["voice"])
      .order("provisioned_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!employee)
      return NextResponse.json(
        { error: "No active website voice employee is assigned." },
        { status: 409 },
      );
    const { data: providerAgent } = await admin
      .from("ai_provider_agents")
      .select("external_agent_id,status")
      .eq("organization_id", organization.id)
      .eq("ai_employee_id", employee.id)
      .eq("provider", "elevenlabs")
      .eq("channel", "website_voice")
      .maybeSingle();
    if (!providerAgent?.external_agent_id || providerAgent.status !== "active")
      return NextResponse.json(
        { error: "Website voice has not been provisioned yet." },
        { status: 409 },
      );
    let { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("organization_id", organization.id)
      .contains("metadata", { widget_session: input.sessionId })
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      let { data: inbox } = await admin
        .from("inboxes")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("channel", "chat")
        .limit(1)
        .maybeSingle();
      if (!inbox) {
        const createdInbox = await admin
          .from("inboxes")
          .insert({
            organization_id: organization.id,
            name: "Website chat and voice",
            channel: "chat",
          })
          .select("id")
          .single();
        if (createdInbox.error) throw createdInbox.error;
        inbox = createdInbox.data;
      }
      const externalId = `widget:${input.sessionId}`;
      let { data: contact } = await admin
        .from("contacts")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("external_id", externalId)
        .limit(1)
        .maybeSingle();
      if (!contact) {
        const createdContact = await admin
          .from("contacts")
          .insert({
            organization_id: organization.id,
            name: "Website voice visitor",
            external_id: externalId,
          })
          .select("id")
          .single();
        if (createdContact.error) throw createdContact.error;
        contact = createdContact.data;
      }
      const createdConversation = await admin
        .from("conversations")
        .insert({
          organization_id: organization.id,
          inbox_id: inbox.id,
          contact_id: contact.id,
          subject: "Website voice conversation",
          metadata: {
            widget_session: input.sessionId,
            source: "website_voice",
            ai_employee_id: employee.id,
          },
        })
        .select("id")
        .single();
      if (createdConversation.error) throw createdConversation.error;
      conversation = createdConversation.data;
    }
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: spend } = await admin
      .from("credit_transactions")
      .select("monetary_amount_minor")
      .eq("organization_id", organization.id)
      .eq("category", "voice")
      .gte("created_at", monthStart.toISOString());
    const used = (spend ?? []).reduce(
      (total, row) =>
        total + Math.max(0, Number(row.monetary_amount_minor ?? 0)),
      0,
    );
    if (
      used >=
      voiceSpendCeilingMinor(employee.usage_budget_cents, subscription?.status)
    )
      return NextResponse.json(
        {
          error:
            subscription?.status === "trialing"
              ? "Voice is available once the subscription starts. Chat is fully available during the trial."
              : "This employee’s monthly voice budget has been reached.",
        },
        { status: 402 },
      );
    const result = await createSignedConversationUrl(
      providerAgent.external_agent_id,
    );
    await admin.from("usage_events").insert({
      organization_id: organization.id,
      event_type: "voice_session_started",
      quantity: 1,
      metadata: {
        ai_employee_id: employee.id,
        widget_session: input.sessionId,
        source: "website_widget",
      },
    });
    return NextResponse.json({
      signedUrl: result.signed_url,
      employeeId: employee.id,
      conversationId: conversation.id,
      disclosure: "AI-powered voice conversation",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice unavailable." },
      { status: 400 },
    );
  }
}
