const apiBase = "https://sandbox-api.paddle.com";

type PaddleList<T> = { data?: T[]; error?: { detail?: string } };
type PaddleItem = {
  id: string;
  status?: string;
  destination?: string;
};
type PaddleTransaction = {
  id: string;
  status: string;
  checkout?: { url?: string | null } | null;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.local`);
  return value;
}

async function paddle<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required("PADDLE_API_KEY")}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & {
    error?: { detail?: string; code?: string };
  };
  if (!response.ok) {
    throw new Error(
      body.error?.detail ??
        body.error?.code ??
        `Paddle returned HTTP ${response.status}`,
    );
  }
  return body;
}

async function main() {
  const environment = required("NEXT_PUBLIC_PADDLE_ENV");
  const apiKey = required("PADDLE_API_KEY");
  const clientToken = required("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  const seatPriceId = required("PADDLE_SEAT_PRICE_ID");
  const overagePriceId = required("PADDLE_OVERAGE_PRICE_ID");
  required("PADDLE_NOTIFICATION_WEBHOOK_SECRET");

  if (environment !== "sandbox") {
    throw new Error("NEXT_PUBLIC_PADDLE_ENV must be sandbox for this test.");
  }
  if (!apiKey.startsWith("pdl_sdbx_")) {
    throw new Error("PADDLE_API_KEY is not a Paddle sandbox key.");
  }
  if (!clientToken.startsWith("test_")) {
    throw new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not a sandbox token.");
  }

  const prices = await paddle<PaddleList<PaddleItem>>("/prices?status=active");
  const activePriceIds = new Set((prices.data ?? []).map((price) => price.id));
  for (const priceId of [seatPriceId, overagePriceId]) {
    if (!activePriceIds.has(priceId)) {
      throw new Error(
        `Configured Paddle price is missing or inactive: ${priceId}`,
      );
    }
  }

  const settings = await paddle<PaddleList<PaddleItem>>(
    "/notification-settings?active=true",
  );
  const hasWebhook = (settings.data ?? []).some((setting) =>
    setting.destination?.endsWith("/api/billing/paddle/webhook"),
  );
  if (!hasWebhook) {
    throw new Error("No active Paddle webhook targets the ResolveX endpoint.");
  }

  const created = await paddle<{ data: PaddleTransaction }>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      items: [{ price_id: seatPriceId, quantity: 1 }],
      checkout: { url: "https://www.getresolvex.com/checkout" },
      custom_data: {
        purpose: "resolvex_sandbox_preflight",
        created_by: "npm_run_test_paddle",
      },
    }),
  });

  if (!created.data.checkout?.url) {
    throw new Error("Paddle created a transaction without a checkout URL.");
  }

  console.log("Paddle sandbox preflight passed.");
  console.log(`Transaction: ${created.data.id} (${created.data.status})`);
  console.log(`Checkout: ${created.data.checkout.url}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
