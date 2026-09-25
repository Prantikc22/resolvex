import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

function contactPhone(attributes: unknown) {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  )
    return null;
  const phone = (attributes as Record<string, unknown>).phone;
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id,contact_id,inbox_id,subject,status,priority,ai_state,sentiment,tags,last_message_at",
    )
    .eq("organization_id", organizationId)
    .neq("status", "closed")
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const contactIds = [
    ...new Set(
      (conversations ?? []).map((item) => item.contact_id).filter(Boolean),
    ),
  ] as string[];
  const inboxIds = [
    ...new Set(
      (conversations ?? []).map((item) => item.inbox_id).filter(Boolean),
    ),
  ] as string[];
  const conversationIds = (conversations ?? []).map((item) => item.id);
  const [{ data: contacts }, { data: inboxes }, { data: messages }] =
    await Promise.all([
      contactIds.length
        ? supabase
            .from("contacts")
            .select("id,name,email,company,attributes")
            .in("id", contactIds)
        : Promise.resolve({ data: [] }),
      inboxIds.length
        ? supabase.from("inboxes").select("id,name,channel").in("id", inboxIds)
        : Promise.resolve({ data: [] }),
      conversationIds.length
        ? supabase
            .from("messages")
            .select(
              "id,conversation_id,sender_type,body,is_internal,created_at",
            )
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: true })
            .limit(1000)
        : Promise.resolve({ data: [] }),
    ]);
  const contactsById = new Map(
    (contacts ?? []).map(({ attributes, ...item }) => [
      item.id,
      { ...item, phone: contactPhone(attributes) },
    ]),
  );
  const inboxesById = new Map((inboxes ?? []).map((item) => [item.id, item]));
  return NextResponse.json({
    conversations: (conversations ?? []).map((conversation) => ({
      ...conversation,
      contact: conversation.contact_id
        ? (contactsById.get(conversation.contact_id) ?? null)
        : null,
      inbox: conversation.inbox_id
        ? (inboxesById.get(conversation.inbox_id) ?? null)
        : null,
      messages: (messages ?? []).filter(
        (message) => message.conversation_id === conversation.id,
      ),
    })),
  });
}
