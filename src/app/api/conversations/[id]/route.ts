import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { sendWorkspaceWebhooks } from "@/lib/integrations/webhooks";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    body: z.string().trim().min(1).max(10000),
  }),
  z.object({ action: z.literal("resolve") }),
]);

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/conversations/[id]">,
) {
  try {
    const input = schema.parse(await request.json());
    const { id } = await params;
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin", "agent"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "A read-only member cannot change conversations." },
        { status: 403 },
      );
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,status")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    if (input.action === "resolve") {
      const { data: messages, error: messageError } = await supabase
        .from("messages")
        .select("sender_type,ai_metadata")
        .eq("conversation_id", id)
        .eq("is_internal", false);
      if (messageError) throw messageError;
      const hasGroundedAiAnswer = (messages ?? []).some(
        (message) =>
          message.sender_type === "ai" &&
          message.ai_metadata?.grounded === true,
      );
      const hasAgentReply = (messages ?? []).some(
        (message) => message.sender_type === "agent",
      );
      const { error } = await supabase
        .from("conversations")
        .update({ status: "resolved", ai_state: "disabled" })
        .eq("id", id);
      if (error) throw error;
      if (
        conversation.status !== "resolved" &&
        hasGroundedAiAnswer &&
        !hasAgentReply
      ) {
        const { error: usageError } = await supabase
          .from("usage_events")
          .insert({
            organization_id: organizationId,
            event_type: "ai_resolution",
            quantity: 1,
            metadata: { conversation_id: id, source: "conversation_resolved" },
          });
        if (usageError && usageError.code !== "23505") throw usageError;
      }
      await sendWorkspaceWebhooks({
        supabase,
        organizationId,
        event: "conversation.resolved",
        data: { conversation_id: id },
      });
      return NextResponse.json({ resolved: true });
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({
        organization_id: organizationId,
        conversation_id: id,
        sender_type: "agent",
        sender_id: user.id,
        body: input.body,
      })
      .select("id,sender_type,body,is_internal,created_at")
      .single();
    if (error) throw error;
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        ai_state: "disabled",
      })
      .eq("id", id);
    await sendWorkspaceWebhooks({
      supabase,
      organizationId,
      event: "conversation.replied",
      data: { conversation_id: id, message: input.body, sender_id: user.id },
    });
    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
