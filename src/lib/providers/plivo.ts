import "server-only";

const baseUrl = "https://api.plivo.com/v1/Account";

function credentials() {
  const authId = process.env.PLIVO_AUTH_ID;
  const authToken = process.env.PLIVO_AUTH_TOKEN;
  if (!authId || !authToken) throw new Error("Plivo is not configured.");
  return { authId, authToken };
}

async function plivoRequest<T>(path: string, init?: RequestInit) {
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
