import { NextResponse } from "next/server";
import { executeComposioTool } from "@/lib/providers/composio";
import { askJev, jevConfigured, type JevQuestion } from "@/lib/providers/jev";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { consumeUsageGuard } from "@/lib/billing/guards";
import { usageGuards } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { gmailMessageUrl } from "@/lib/integrations/gmail-link";

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
  automated?: boolean;
};

const AUTOMATED_SENDER =
  /(no-?reply|do-?not-?reply|notifications?|alerts?|mailer-daemon|bounce|updates?)@/i;

function senderName(raw: string) {
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>/);
  return {
    name: (match?.[1] ?? raw).trim() || "Email sender",
    address: (match?.[2] ?? raw).trim(),
  };
}

async function gmailMailbox(organizationId: string) {
  try {
    const profile = record(
      await executeComposioTool({
        organizationId,
        toolkit: "gmail",
        toolSlug: "GMAIL_GET_PROFILE",
        arguments: { user_id: "me" },
      }),
    );
    const email = record(profile.data).emailAddress;
    return typeof email === "string" && email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

async function gmailSignals(organizationId: string) {
  const [mailbox, fetched] = await Promise.all([
    gmailMailbox(organizationId),
    executeComposioTool({
      organizationId,
      toolkit: "gmail",
      toolSlug: "GMAIL_FETCH_EMAILS",
      arguments: {
        user_id: "me",
        query:
          "is:unread newer_than:7d -category:promotions -category:social -category:forums",
        max_results: 12,
        include_payload: false,
        include_spam_trash: false,
        ids_only: false,
        verbose: false,
      },
    }),
  ]);
  const messages = records(record(record(fetched).data).messages);
  return messages.map<Signal>((message) => {
    const preview = record(message.preview);
    const sender = senderName(String(message.sender ?? "Email sender"));
    return {
      id: String(message.messageId ?? message.id ?? crypto.randomUUID()),
      source: "gmail",
      sender: sender.name,
      automated: AUTOMATED_SENDER.test(sender.address),
      subject: String(message.subject ?? preview.subject ?? "Email"),
      preview: String(message.messageText ?? preview.body ?? "").slice(0, 500),
      occurredAt: message.messageTimestamp
        ? String(message.messageTimestamp)
        : null,
      url: gmailMessageUrl(message, mailbox),
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
      ).map((message) => ({ channel, channelId: id, message }));
    }),
  );
  return Promise.all(
    batches
      .flat()
      .slice(0, 12)
      .map(async ({ channel, channelId, message }): Promise<Signal> => {
        const messageTs = String(message.ts ?? message.id ?? "");
        let url: string | null = null;
        if (messageTs) {
          try {
            const permalinkResult = record(
              await executeComposioTool({
                organizationId,
                toolkit: "slack",
                toolSlug: "SLACK_RETRIEVE_MESSAGE_PERMALINK_URL",
                arguments: { channel: channelId, message_ts: messageTs },
              }),
            );
            const permalinkData = record(permalinkResult.data);
            url =
              typeof permalinkData.permalink === "string"
                ? permalinkData.permalink
                : null;
          } catch {
            // The attention brief still works if the connected Slack account
            // does not grant chat.getPermalink; only the deep link is omitted.
          }
        }
        return {
          id: `${channelId}:${messageTs || crypto.randomUUID()}`,
          source: "slack",
          sender: String(
            message.username ?? message.user_name ?? message.user ?? "Slack",
          ),
          subject: `#${String(channel.name ?? channel.user ?? "conversation")}`,
          preview: String(message.text ?? "").slice(0, 500),
          occurredAt: messageTs || null,
          url,
        };
      }),
  );
}

// People outrank automated notifications; urgency breaks ties.
function priority(item: Signal & { needsHuman: number; urgency: number }) {
  return item.needsHuman + item.urgency / 3 - (item.automated ? 0.75 : 0);
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
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, 8);
}

// Short-lived, in-memory only: a brief is reused for a few minutes so moving
// between screens is instant, without persisting any mailbox content.
const BRIEF_TTL_MS = 5 * 60_000;
const briefCache = new Map<string, { at: number; body: unknown }>();

export async function GET(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const refresh = new URL(request.url).searchParams.has("refresh");
  const cached = briefCache.get(organizationId);
  if (!refresh && cached && Date.now() - cached.at < BRIEF_TTL_MS)
    return NextResponse.json(cached.body);
  const allowed = await consumeUsageGuard(
    createAdminClient(),
    `attention:${organizationId}`,
    usageGuards.attentionPerHour,
    3_600,
  );
  if (!allowed)
    return NextResponse.json(
      {
        error:
          "The attention brief refreshes up to 20 times an hour. Try again shortly.",
      },
      { status: 429 },
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
  const body = {
    items,
    connected: {
      gmail: connected.has("composio:gmail"),
      slack: connected.has("composio:slack"),
    },
    decisionEngine: jevConfigured(),
    storage: "none",
  };
  briefCache.set(organizationId, { at: Date.now(), body });
  return NextResponse.json(body);
}
