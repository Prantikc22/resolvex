import { NextResponse } from "next/server";
import { z } from "zod";
import { createHumanHandoff } from "@/lib/handoff";
import { subscriptionHasWorkspaceAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  key: z.string().uuid(),
  sessionId: z.string().uuid(),
  source: z.enum(["website_chat", "website_voice"]).default("website_chat"),
  reason: z.string().trim().min(2).max(500),
  summary: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(40).optional(),
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
      .select("status,provider,metadata")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!subscriptionHasWorkspaceAccess(subscription))
      return NextResponse.json(
        { error: "Messenger unavailable." },
        { status: 402 },
      );
    const settings = (organization.settings ?? {}) as Record<string, unknown>;
    if (settings.human_handoff_enabled === false)
      return NextResponse.json(
        {
          error:
            typeof settings.handoff_contact_message === "string"
              ? settings.handoff_contact_message
              : "Human handoff is not enabled for this workspace.",
        },
        { status: 409 },
      );
    const { data: conversation } = await admin
      .from("conversations")
      .select("id,metadata")
      .eq("organization_id", organization.id)
      .contains("metadata", { widget_session: input.sessionId })
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation)
      return NextResponse.json(
        { error: "Send a message before requesting a person." },
        { status: 409 },
      );
    const employeeId =
      typeof conversation.metadata?.ai_employee_id === "string"
        ? conversation.metadata.ai_employee_id
        : null;
    const result = await createHumanHandoff({
      supabase: admin,
      organizationId: organization.id,
      conversationId: conversation.id,
      employeeId,
      source: input.source,
      reason: input.reason,
      summary: input.summary,
      callbackPhone: input.phone,
    });
    return NextResponse.json({
      handoffId: result.handoff.id,
      status: result.handoff.status,
      duplicate: result.duplicate,
      message: result.duplicate
        ? "Your request is already in the team queue."
        : "Your conversation is now in the team queue. A person can accept it from the ResolveX inbox.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Handoff failed." },
      { status: 400 },
    );
  }
}
