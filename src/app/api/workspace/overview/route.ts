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
    organizationResult,
    employeeResult,
    phoneResult,
    approvalResult,
    jobResult,
    nextJobResult,
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
    supabase
      .from("organizations")
      .select("name,support_email,widget_enabled,settings")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("ai_employees")
      .select("id,status,connected_toolkits,assigned_channels")
      .eq("organization_id", organizationId),
    supabase
      .from("phone_numbers")
      .select("id,status")
      .eq("organization_id", organizationId),
    supabase
      .from("approval_requests")
      .select("id,title,risk,created_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("employee_jobs")
      .select("status")
      .eq("organization_id", organizationId)
      .gte("updated_at", new Date(Date.now() - 86400_000).toISOString())
      .limit(2000),
    supabase
      .from("employee_jobs")
      .select("job_type,trigger_type,run_at")
      .eq("organization_id", organizationId)
      .in("status", ["queued", "retrying"])
      .gt("run_at", new Date().toISOString())
      .order("run_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const error = [
    sourcesResult,
    contactsResult,
    conversationsResult,
    messagesResult,
    usageResult,
    automationResult,
    integrationResult,
    organizationResult,
    employeeResult,
    phoneResult,
    approvalResult,
    jobResult,
    nextJobResult,
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
    setup: {
      steps: [
        {
          id: "business_profile",
          label: "Complete business profile",
          complete: Boolean(
            organizationResult.data?.name &&
            organizationResult.data?.support_email,
          ),
          view: "settings",
        },
        {
          id: "knowledge",
          label: "Approve knowledge",
          complete: (sourcesResult.data ?? []).some(
            (source) => source.status === "ready",
          ),
          view: "knowledge",
        },
        {
          id: "integrations",
          label: "Connect a business app",
          complete:
            (integrationResult.data ?? []).some(
              (item) => item.status === "connected",
            ) ||
            (employeeResult.data ?? []).some(
              (employee) => employee.connected_toolkits?.length,
            ),
          view: "integrations",
        },
        {
          id: "employee",
          label: "Activate an AI employee",
          complete: (employeeResult.data ?? []).some(
            (employee) => employee.status === "active",
          ),
          view: "employees",
        },
        {
          id: "widget",
          label: "Enable and install the website widget",
          complete: Boolean(organizationResult.data?.widget_enabled),
          view: "settings",
        },
        {
          id: "telephone",
          label: "Optional: connect a customer-owned telephone number",
          complete: (phoneResult.data ?? []).some(
            (number) => number.status === "active",
          ),
          view: "phone_numbers",
          optional: true,
        },
      ],
    },
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
    workforce: {
      activeEmployees: (employeeResult.data ?? []).filter(
        (employee) => employee.status === "active",
      ).length,
      totalEmployees: employeeResult.data?.length ?? 0,
      runs24h: (jobResult.data ?? []).length,
      succeeded24h: (jobResult.data ?? []).filter(
        (job) => job.status === "succeeded",
      ).length,
      failed24h: (jobResult.data ?? []).filter((job) => job.status === "failed")
        .length,
      nextJob: nextJobResult.data ?? null,
    },
    approvals: {
      pending: approvalResult.count ?? 0,
      latest: approvalResult.data ?? [],
    },
    integrations: {
      total: integrationResult.data?.length ?? 0,
      connected: (integrationResult.data ?? []).filter(
        (item) => item.status === "connected",
      ).length,
    },
  });
}
