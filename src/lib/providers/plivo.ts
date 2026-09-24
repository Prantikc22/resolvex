import crypto from "node:crypto";
import "server-only";

const baseUrl = "https://api.plivo.com/v1/Account";

function credentials() {
  const authId = process.env.PLIVO_AUTH_ID;
  const authToken = process.env.PLIVO_AUTH_TOKEN;
  if (!authId || !authToken) throw new Error("Plivo is not configured.");
  return { authId, authToken };
}

export async function plivoRequest<T>(path: string, init?: RequestInit) {
  const { authId, authToken } = credentials();
  const response = await fetch(`${baseUrl}/${authId}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${authId}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      body.error ?? body.message ?? `Plivo returned ${response.status}.`,
    );
  }
  return body;
}

export async function createPlivoApplication(input: {
  name: string;
  answerUrl: string;
  hangupUrl: string;
}) {
  return plivoRequest<{ app_id: string; message?: string }>("/Application/", {
    method: "POST",
    body: JSON.stringify({
      app_name: input.name,
      answer_url: input.answerUrl,
      answer_method: "POST",
      hangup_url: input.hangupUrl,
      hangup_method: "POST",
    }),
  });
}

export async function buyPlivoNumber(input: {
  number: string;
  appId: string;
  complianceApplicationId?: string | null;
}) {
  return plivoRequest<{ message?: string }>(
    `/PhoneNumber/${encodeURIComponent(input.number)}/`,
    {
      method: "POST",
      body: JSON.stringify({
        app_id: input.appId,
        ...(input.complianceApplicationId
          ? { compliance_application_id: input.complianceApplicationId }
          : {}),
      }),
    },
  );
}

export async function createPlivoSipCredential(input: {
  name: string;
  username: string;
  password: string;
}) {
  return plivoRequest<{ credential_uuid: string }>("/Zentrunk/Credential/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createPlivoOutboundTrunk(input: {
  name: string;
  credentialUuid: string;
}) {
  return plivoRequest<{
    trunk_id?: string;
    trunk_uuid?: string;
  }>("/Zentrunk/Trunk/", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      trunk_direction: "outbound",
      trunk_status: "enabled",
      credential_uuid: input.credentialUuid,
    }),
  });
}

export async function retrievePlivoTrunk(trunkId: string) {
  return plivoRequest<{
    object?: { trunk_id?: string; trunk_domain?: string };
    trunk_id?: string;
    trunk_domain?: string;
  }>(`/Zentrunk/Trunk/${encodeURIComponent(trunkId)}/`, { method: "GET" });
}

export async function retrievePlivoCall(callId: string) {
  return plivoRequest<{
    call_uuid?: string;
    call_status?: string;
    call_direction?: string;
    from_number?: string;
    to_number?: string;
    bill_duration?: number | string;
    total_amount?: number | string;
    total_rate?: number | string;
    initiation_time?: string;
    answer_time?: string;
    end_time?: string;
  }>(`/Call/${encodeURIComponent(callId)}/`, { method: "GET" });
}

export function verifyPlivoV3Signature(input: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
  nonce: string | null;
}) {
  if (!input.signature || !input.nonce || !process.env.PLIVO_AUTH_TOKEN)
    return false;
  const signedPayload = `${input.url}${Object.entries(input.params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("")}${input.nonce}`;
  const expected = crypto
    .createHmac("sha256", process.env.PLIVO_AUTH_TOKEN)
    .update(signedPayload)
    .digest("base64");
  const candidates = input.signature.split(",").map((value) => value.trim());
  return candidates.some((candidate) => {
    const left = Buffer.from(candidate);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

export async function searchPlivoNumbers({
  country,
  type,
  limit = 10,
}: {
  country: string;
  type?: "local" | "tollfree" | "mobile" | "fixed";
  limit?: number;
}) {
  const query = new URLSearchParams({
    country_iso: country.toUpperCase(),
    services: "voice",
    limit: String(Math.min(Math.max(limit, 1), 20)),
  });
  if (type) query.set("type", type);
  return plivoRequest<{
    objects?: Array<{
      number: string;
      type?: string;
      region?: string;
      monthly_rental_rate?: string;
      setup_rate?: string;
      currency?: string;
      restriction?: string;
      restriction_text?: string;
    }>;
  }>(`/PhoneNumber/?${query}`, { method: "GET" });
}

export function plivoConfigured() {
  return Boolean(process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN);
}
