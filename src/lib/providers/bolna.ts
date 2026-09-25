import "server-only";

import { publicAppUrl } from "@/lib/app-url";

type JsonRecord = Record<string, unknown>;

const defaultBaseUrl = "https://api.bolna.ai";

function apiKey() {
  const value = process.env.BOLNA_API_KEY?.trim();
  if (!value)
    throw new Error("Managed telephony is not configured on the server.");
  return value;
}

function baseUrl() {
  return (process.env.BOLNA_API_BASE_URL || defaultBaseUrl).replace(/\/$/, "");
}

export function bolnaConfigured() {
  return Boolean(process.env.BOLNA_API_KEY?.trim());
}

async function bolnaRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const raw = await response.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw.slice(0, 500) };
  }
  if (!response.ok) {
    const record = body && typeof body === "object" ? (body as JsonRecord) : {};
    const detail = record.detail;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof detail === "string"
          ? detail
          : `The managed telephony provider returned ${response.status}.`;
    throw new Error(message.replaceAll(/bolna/gi, "managed telephony"));
  }
  return body as T;
}

export async function listBolnaAgents() {
  const result = await bolnaRequest<unknown>("/v2/agent/all");
  if (Array.isArray(result)) return result;
  const row = result as JsonRecord;
  return Array.isArray(row.agents) ? row.agents : [];
}

export async function listBolnaPhoneNumbers() {
  const result = await bolnaRequest<unknown>("/phone-numbers/all");
  if (Array.isArray(result)) return result as JsonRecord[];
  const row = result as JsonRecord;
  const values = row.phone_numbers ?? row.items ?? row.numbers;
  return Array.isArray(values) ? (values as JsonRecord[]) : [];
}

export async function createBolnaSipTrunk(input: {
  name: string;
  provider: string;
  gatewayAddress: string;
  port: number;
  authType: "userpass" | "ip-based";
  authUsername?: string;
  authPassword?: string;
  ipIdentifiers?: string[];
  phoneNumber: string;
}) {
  return bolnaRequest<JsonRecord>("/sip-trunks/trunks", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      provider: input.provider,
      auth_type: input.authType,
      ...(input.authType === "userpass"
        ? {
            auth_username: input.authUsername,
            auth_password: input.authPassword,
          }
        : {
            ip_identifiers: (input.ipIdentifiers ?? []).map((ip_address) => ({
              ip_address,
            })),
          }),
      gateways: [
        {
          gateway_address: input.gatewayAddress,
          port: input.port,
          priority: 1,
        },
      ],
      allow: "ulaw,alaw",
      disallow: "all",
      inbound_enabled: true,
      outbound_leading_plus_enabled: true,
      phone_numbers: [
        {
          phone_number: input.phoneNumber.replace(/^\+/, ""),
          name: input.name,
          e164_check_enabled: false,
        },
      ],
    }),
  });
}

export async function assignBolnaInboundAgent(input: {
  agentId: string;
  phoneNumberId: string;
}) {
  return bolnaRequest<JsonRecord>("/inbound/setup", {
    method: "POST",
    body: JSON.stringify({
      agent_id: input.agentId,
      phone_number_id: input.phoneNumberId,
      allow_multiple: true,
    }),
  });
}

async function ensureOpenRouterProvider() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) return false;
  const existing = await bolnaRequest<JsonRecord>("/providers");
  const providers = Array.isArray(existing.providers)
    ? (existing.providers as JsonRecord[])
    : [];
  const alreadyConnected = providers.some((provider) =>
    String(provider.provider_name ?? provider.name ?? "")
      .toUpperCase()
      .includes("OPENROUTER"),
  );
  if (!alreadyConnected) {
    await bolnaRequest("/providers", {
      method: "POST",
      body: JSON.stringify({
        provider_name: "OPENROUTER_API_KEY",
        provider_value: openRouterKey,
      }),
    });
  }
  return true;
}

function normalizeBolnaLanguage(language: string) {
  const primary = language.toLowerCase().split("-")[0];
  return primary === "en" ? "en" : primary || "hi";
}

export type BolnaAgentInput = {
  name: string;
  instructions: string;
  greeting: string;
  language: string;
  transferToNumber?: string | null;
};

async function bolnaAgentPayload(input: BolnaAgentInput) {
  const language = normalizeBolnaLanguage(input.language);
  const useOpenRouter = await ensureOpenRouterProvider();
  const webhookSecret = process.env.BOLNA_WEBHOOK_SECRET?.trim();
  const webhookUrl = webhookSecret
    ? `${publicAppUrl()}/api/voice/webhooks/bolna?token=${encodeURIComponent(webhookSecret)}`
    : undefined;
  const transferTool = input.transferToNumber
    ? {
        api_tools: {
          tools: [
            {
              name: "transfer_call_human",
              key: "transfer_call",
              description:
                "Transfer the caller only when they explicitly request a human or the request requires human authority.",
              parameters: {
                type: "object",
                properties: {
                  call_sid: {
                    type: "string",
                    description: "Unique call identifier",
                  },
                },
                required: ["call_sid"],
              },
            },
          ],
          tools_params: {
            transfer_call_human: {
              method: "POST",
              url: null,
              api_token: null,
              param: JSON.stringify({
                call_transfer_number: input.transferToNumber,
                call_sid: "%(call_sid)s",
              }),
            },
          },
        },
      }
    : {};
  return {
    agent_config: {
      agent_name: input.name,
      agent_welcome_message: input.greeting,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      tasks: [
        {
          task_type: "conversation",
          toolchain: {
            execution: "sequential",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            llm_agent: {
              agent_type: "simple_llm_agent",
              agent_flow_type: "streaming",
              llm_config: useOpenRouter
                ? {
                    provider: "openrouter",
                    model:
                      process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
                    max_tokens: 180,
                    temperature: 0.4,
                  }
                : {
                    provider: "openai",
                    model: "gpt-5.4-mini",
                    max_tokens: 180,
                    temperature: 1,
                  },
            },
            synthesizer: {
              provider: "sarvam",
              provider_config: {
                voice: "Pooja",
                voice_id: "pooja",
                model: "bulbul:v3",
                language,
              },
              stream: true,
              buffer_size: 250,
              audio_format: "wav",
            },
            transcriber: {
              provider: language === "hi" ? "sarvam" : "deepgram",
              model: language === "hi" ? "saaras:v4" : "nova-3",
              language,
              stream: true,
              encoding: "linear16",
              sampling_rate: 8000,
              endpointing: 300,
              context: input.name,
            },
            input: { provider: "plivo", format: "wav" },
            output: { provider: "plivo", format: "wav" },
            ...transferTool,
          },
          task_config: {
            call_terminate: 900,
            hangup_after_silence: 20,
          },
        },
      ],
    },
    agent_prompts: {
      task_1: {
        system_prompt: `${input.instructions}\n\nYou are the telephone version of this ResolveX AI employee. Use only verified information. Keep replies concise and natural for a phone call. Never claim an external action succeeded without a confirmed tool result. Offer a human handoff whenever the caller asks or authority is required.`,
      },
    },
  };
}

export async function createBolnaAgent(input: BolnaAgentInput) {
  return bolnaRequest<{
    agent_id: string;
    state?: string;
    version_id?: string;
  }>("/v2/agent", {
    method: "POST",
    body: JSON.stringify(await bolnaAgentPayload(input)),
  });
}

export async function updateBolnaAgent(
  agentId: string,
  input: BolnaAgentInput,
) {
  return bolnaRequest<JsonRecord>(`/v2/agent/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: JSON.stringify(await bolnaAgentPayload(input)),
  });
}

export async function deleteBolnaAgent(agentId: string) {
  return bolnaRequest<JsonRecord>(`/v2/agent/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
  });
}

export async function makeBolnaCall(input: {
  agentId: string;
  recipientPhoneNumber: string;
  fromPhoneNumber?: string;
  userData?: JsonRecord;
}) {
  return bolnaRequest<JsonRecord>("/call", {
    method: "POST",
    body: JSON.stringify({
      agent_id: input.agentId,
      recipient_phone_number: input.recipientPhoneNumber,
      ...(input.fromPhoneNumber
        ? { from_phone_number: input.fromPhoneNumber }
        : {}),
      user_data: input.userData ?? {},
    }),
  });
}

export async function getBolnaExecution(executionId: string) {
  return bolnaRequest<JsonRecord>(
    `/executions/${encodeURIComponent(executionId)}`,
  );
}
