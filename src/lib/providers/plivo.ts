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
