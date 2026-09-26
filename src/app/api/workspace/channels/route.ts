import { NextResponse } from "next/server";
import { voicePauseReason } from "@/lib/billing/voice-credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

type Channel = {
  id: string;
  name: string;
  state: "live" | "action" | "paused" | "soon";
  status: string;
  detail: string;
  view?: string;
};

/** Live status of every customer channel for the current workspace. */
export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [organization, employees, integrations, agents, numbers, subscription] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("widget_enabled,settings")
        .eq("id", organizationId)
        .single(),
      supabase
        .from("ai_employees")
        .select("status,assigned_channels")
        .eq("organization_id", organizationId),
      supabase
        .from("integrations")
        .select("provider,status")
        .eq("organization_id", organizationId)
        .eq("status", "connected"),
      supabase
        .from("ai_provider_agents")
        .select("provider,channel,status")
        .eq("organization_id", organizationId),
      supabase
        .from("phone_numbers")
        .select("status")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      supabase
        .from("subscriptions")
        .select("status,provider,metadata")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

  const active = (employees.data ?? []).filter((e) => e.status === "active");
  const serves = (channel: string) =>
    active.some((e) => e.assigned_channels?.includes(channel));
  const connected = new Set(
    (integrations.data ?? []).map((row) => row.provider),
  );
  const agent = (provider: string, channel: string) =>
    (agents.data ?? []).find(
      (row) => row.provider === provider && row.channel === channel,
    );
  const webVoice = agent("elevenlabs", "website_voice");
  const phoneAgent = agent("bolna", "telephone");
  const liveNumbers = numbers.data?.length ?? 0;
  const pauseReason =
    webVoice?.status === "paused" || phoneAgent?.status === "paused"
      ? await voicePauseReason(
          createAdminClient(),
          organizationId,
          subscription.data,
        )
      : null;
  const email = ["gmail", "outlook"].filter((app) =>
    connected.has(`composio:${app}`),
  );

  const channels: Channel[] = [
    organization.data?.widget_enabled && serves("chat")
      ? {
          id: "chat",
          name: "Website chat",
          state: "live",
          status: "Live",
          detail: "The messenger is enabled and an AI employee answers chats.",
          view: "settings",
        }
      : {
          id: "chat",
          name: "Website chat",
          state: "action",
          status: "Setup required",
          detail: organization.data?.widget_enabled
            ? "Assign an active AI employee to the chat channel."
            : "Enable the messenger and install the snippet on your site.",
          view: organization.data?.widget_enabled ? "employees" : "settings",
        },
    email.length
      ? {
          id: "email",
          name: "Email",
          state: "live",
          status: "Connected",
          detail: `${email.map((app) => (app === "gmail" ? "Gmail" : "Outlook")).join(" and ")} connected. Messages feed the attention brief and AI employees.`,
          view: "integrations",
        }
      : {
          id: "email",
          name: "Email",
          state: "action",
          status: "Setup required",
          detail: "Connect Gmail or Outlook under Integrations.",
          view: "integrations",
        },
    webVoice?.status === "active"
      ? {
          id: "voice",
          name: "AI voice",
          state: "live",
          status: "Live",
          detail:
            "Visitors can talk to your assistant from the website messenger.",
          view: "employees",
        }
      : webVoice?.status === "paused"
        ? {
            id: "voice",
            name: "AI voice",
            state: "paused",
            status: "Paused",
            detail:
              pauseReason ?? "Add prepaid voice minutes, then reactivate.",
            view: "usage",
          }
        : {
            id: "voice",
            name: "AI voice",
            state: "action",
            status: "Employee required",
            detail:
              "Activate an AI employee with the voice channel on a paid plan with voice minutes.",
            view: "employees",
          },
    liveNumbers && phoneAgent?.status === "active"
      ? {
          id: "phone",
          name: "Telephone",
          state: "live",
          status: `${liveNumbers} number${liveNumbers === 1 ? "" : "s"} live`,
          detail: "Calls to your connected numbers are answered by AI.",
          view: "phone_numbers",
        }
      : {
          id: "phone",
          name: "Telephone",
          state: phoneAgent?.status === "paused" ? "paused" : "action",
          status:
            phoneAgent?.status === "paused" ? "Paused" : "Bring your number",
          detail:
            phoneAgent?.status === "paused"
              ? (pauseReason ?? "Add prepaid voice minutes, then reactivate.")
              : "Connect a number you own from Twilio, Plivo, Exotel, Vonage or any SIP carrier.",
          view: "phone_numbers",
        },
    connected.has("composio:whatsapp")
      ? {
          id: "whatsapp",
          name: "WhatsApp",
          state: "live",
          status: "Connected",
          detail:
            "AI employees can send confirmations and replies on WhatsApp.",
          view: "integrations",
        }
      : {
          id: "whatsapp",
          name: "WhatsApp",
          state: "action",
          status: "Not connected",
          detail: "Connect WhatsApp Business under Integrations.",
          view: "integrations",
        },
    {
      id: "social",
      name: "Instagram & Messenger",
      state: "soon",
      status: "Coming soon",
      detail: "Direct messages from Instagram and Facebook in the same inbox.",
    },
  ];
  return NextResponse.json({ channels });
}
