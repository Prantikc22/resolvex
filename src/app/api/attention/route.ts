import { NextResponse } from "next/server";
import { executeComposioTool } from "@/lib/providers/composio";
import { askJev, jevConfigured, type JevQuestion } from "@/lib/providers/jev";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

type Signal = {
  id: string;
  source: "gmail" | "slack";
  sender: string;
  subject: string;
  preview: string;
  occurredAt: string | null;
  url: string | null;
};

async function gmailSignals(organizationId: string) {
  const result = record(
    await executeComposioTool({
      organizationId,
      toolkit: "gmail",
      toolSlug: "GMAIL_FETCH_EMAILS",
      arguments: {
        user_id: "me",
        query: "is:unread newer_than:7d -category:promotions",
        max_results: 12,
        include_payload: false,
        include_spam_trash: false,
        ids_only: false,
        verbose: false,
      },
    }),
  );
  const messages = records(record(result.data).messages);
  return messages.map<Signal>((message) => {
    const preview = record(message.preview);
    return {
      id: String(message.messageId ?? message.id ?? crypto.randomUUID()),
      source: "gmail",
      sender: String(message.sender ?? "Email sender"),
      subject: String(message.subject ?? preview.subject ?? "Email"),
      preview: String(message.messageText ?? preview.body ?? "").slice(0, 500),
      occurredAt: message.messageTimestamp
        ? String(message.messageTimestamp)
        : null,
      url: typeof message.display_url === "string" ? message.display_url : null,
    };
  });
}

async function slackSignals(organizationId: string) {
  const list = record(
    await executeComposioTool({
      organizationId,
      toolkit: "slack",
      toolSlug: "SLACK_LIST_CONVERSATIONS",
      arguments: {
        limit: 20,
        types: "public_channel,private_channel,im,mpim",
        exclude_archived: true,
      },
    }),
  );
  const data = record(list.data);
  const channels = records(
    data.channels ?? data.conversations ?? record(data.response).channels,
  ).slice(0, 4);
  const oldest = String(Math.floor(Date.now() / 1000) - 86_400);
  const batches = await Promise.all(
    channels.map(async (channel) => {
      const id = String(channel.id ?? "");
      if (!id) return [];
      const history = record(
        await executeComposioTool({
          organizationId,
          toolkit: "slack",
          toolSlug: "SLACK_FETCH_CONVERSATION_HISTORY",
          arguments: { channel: id, limit: 10, oldest },
        }),
      );
      const historyData = record(history.data);
      return records(
        historyData.messages ?? record(historyData.response).messages,
      ).map<Signal>((message) => ({
        id: `${id}:${String(message.ts ?? message.id ?? crypto.randomUUID())}`,
        source: "slack",
        sender: String(
          message.username ?? message.user_name ?? message.user ?? "Slack",
        ),
        subject: `#${String(channel.name ?? channel.user ?? "conversation")}`,
        preview: String(message.text ?? "").slice(0, 500),
        occurredAt: message.ts ? String(message.ts) : null,
        url: null,
      }));
    }),
  );
  return batches.flat();
}

async function addDecisions(signals: Signal[]) {
  const candidates = signals
    .filter((item) => item.preview || item.subject)
    .slice(0, 12);
  if (!candidates.length || !jevConfigured())
    return candidates.map((item) => ({
      ...item,
      intent: "general",
      confidence: 0,
      urgency: 0,
      needsHuman: 0,
    }));
  const questions = Object.fromEntries(
    candidates.flatMap((_, index) => [
      [
        `intent_${index}`,
        {
          type: "choice",
          instructions: `Choose the primary team for state.signals[${index}].`,
          criteria: {
            billing: "Payments, invoices, refunds, subscriptions, or charges.",
            technical: "Bugs, outages, integrations, or technical problems.",
            sales:
              "Pricing, demos, buying intent, or commercial opportunities.",
            success: "Onboarding, adoption, retention, or account outcomes.",
            general: "Important but not covered by another option.",
          },
        },
      ],
      [
        `urgency_${index}`,
        {
          type: "score",
          instructions: `How urgently should a human review state.signals[${index}]?`,
          criteria: ["Routine", "Today", "Urgent", "Critical"],
        },
      ],
      [
        `human_${index}`,
        {
          type: "noul",
          instructions: `Does state.signals[${index}] need human attention today?`,
        },
      ],
    ]),
  ) as Record<string, JevQuestion>;
  const answers = await askJev({
    state: {
      signals: candidates.map(({ source, sender, subject, preview }) => ({
        source,
        sender,
        subject,
        preview,
      })),
    },
    questions,
  });
  return candidates
    .map((item, index) => ({
      ...item,
      intent: answers[`intent_${index}`]?.choice ?? "general",
      confidence: Number(answers[`intent_${index}`]?.confidence ?? 0),
      urgency: Number(answers[`urgency_${index}`]?.score ?? 0),
      needsHuman: Number(answers[`human_${index}`]?.noul ?? 0),
    }))
    .sort(
      (a, b) => b.needsHuman + b.urgency / 3 - (a.needsHuman + a.urgency / 3),
    )
    .slice(0, 8);
}

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider,status")
    .eq("organization_id", organizationId)
    .in("provider", ["composio:gmail", "composio:slack"])
    .eq("status", "connected");
  const connected = new Set((integrations ?? []).map((item) => item.provider));
  const results = await Promise.allSettled([
    connected.has("composio:gmail")
      ? gmailSignals(organizationId)
      : Promise.resolve([]),
    connected.has("composio:slack")
      ? slackSignals(organizationId)
      : Promise.resolve([]),
  ]);
  const signals = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  let items;
  try {
    items = await addDecisions(signals);
  } catch {
    items = signals.slice(0, 8).map((item) => ({
      ...item,
      intent: "general",
      confidence: 0,
      urgency: 0,
      needsHuman: 0,
    }));
  }
  return NextResponse.json({
    items,
    connected: {
      gmail: connected.has("composio:gmail"),
      slack: connected.has("composio:slack"),
    },
    decisionEngine: jevConfigured(),
    storage: "none",
  });
}
