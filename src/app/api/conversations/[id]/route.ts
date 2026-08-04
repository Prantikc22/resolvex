import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

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
    const { supabase, user, organizationId } = await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    if (input.action === "resolve") {
      const { error } = await supabase
        .from("conversations")
        .update({ status: "resolved", ai_state: "disabled" })
        .eq("id", id);
      if (error) throw error;
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
    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
