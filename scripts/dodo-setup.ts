/**
 * Idempotently provisions the ResolveX catalog in Dodo Payments:
 *   - "AI resolutions" usage meter
 *   - ResolveX One monthly: $15 per seat, 50 resolutions included, $0.39 after
 *   - ResolveX One annual: $144 per seat per year, 600 resolutions included
 *   - Prepaid voice packs: 100, 500 and 2,000 minutes (one-time purchases)
 * Voice is prepaid only, so neither subscription carries a voice meter.
 * Prints the environment variables the app needs, then previews checkouts.
 *
 * Usage: npm run dodo:setup            (uses DODO_PAYMENTS_ENVIRONMENT)
 */
import DodoPayments from "dodopayments";

const RESOLUTION_EVENT = "ai.resolution";

const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is required in .env.local");
const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";
const dodo = new DodoPayments({ bearerToken: apiKey, environment });

type Price = DodoPayments.ProductCreateParams["price"];
type CatalogItem = {
  key: string;
  env: string;
  name: string;
  description: string;
  price: (resolutionMeterId: string) => Price;
};

function subscriptionPrice(
  resolutionMeterId: string,
  interval: "Month" | "Year",
): Price {
  const yearly = interval === "Year";
  return {
    type: "usage_based_price",
    currency: "USD",
    fixed_price: yearly ? 14400 : 1500,
    payment_frequency_count: 1,
    payment_frequency_interval: interval,
    subscription_period_count: 10,
    subscription_period_interval: "Year",
    tax_inclusive: false,
    meters: [
      {
        meter_id: resolutionMeterId,
        price_per_unit: "39",
        free_threshold: yearly ? 600 : 50,
      },
    ],
  };
}

function voicePackPrice(cents: number): Price {
  return {
    type: "one_time_price",
    currency: "USD",
    price: cents,
    discount: 0,
    purchasing_power_parity: false,
    tax_inclusive: false,
  };
}

const catalog: CatalogItem[] = [
  {
    key: "resolvex_one",
    env: "DODO_PAYMENTS_PRODUCT_ID",
    name: "ResolveX One",
    description:
      "AI customer service workspace. Priced per paid agent seat; includes 50 completed AI resolutions each month.",
    price: (meter) => subscriptionPrice(meter, "Month"),
  },
  {
    key: "resolvex_one_annual",
    env: "DODO_PAYMENTS_ANNUAL_PRODUCT_ID",
    name: "ResolveX One (Annual)",
    description:
      "ResolveX One billed yearly per agent seat — two months free. Includes 600 completed AI resolutions per year.",
    price: (meter) => subscriptionPrice(meter, "Year"),
  },
  {
    key: "voice_pack_100",
    env: "DODO_PAYMENTS_VOICE_PACK_100",
    name: "ResolveX voice minutes — 100",
    description: "100 prepaid AI voice minutes for web voice and phone agents.",
    price: () => voicePackPrice(2200),
  },
  {
    key: "voice_pack_500",
    env: "DODO_PAYMENTS_VOICE_PACK_500",
    name: "ResolveX voice minutes — 500",
    description: "500 prepaid AI voice minutes for web voice and phone agents.",
    price: () => voicePackPrice(9900),
  },
  {
    key: "voice_pack_2000",
    env: "DODO_PAYMENTS_VOICE_PACK_2000",
    name: "ResolveX voice minutes — 2,000",
    description:
      "2,000 prepaid AI voice minutes for web voice and phone agents.",
    price: () => voicePackPrice(38000),
  },
];

async function ensureResolutionMeter() {
  for await (const meter of dodo.meters.list()) {
    if (meter.event_name === RESOLUTION_EVENT) return meter;
  }
  return dodo.meters.create({
    name: "AI resolutions",
    description:
      "Completed AI resolutions. Drafts and human handoffs are never sent.",
    event_name: RESOLUTION_EVENT,
    measurement_unit: "resolutions",
    aggregation: { type: "count" },
  });
}

async function ensureProduct(item: CatalogItem, resolutionMeterId: string) {
  const price = item.price(resolutionMeterId);
  for await (const product of dodo.products.list()) {
    if (product.metadata?.resolvex_key !== item.key) continue;
    // Keep the live definition in step with this file (drops old meters too).
    await dodo.products.update(product.product_id, {
      name: item.name,
      description: item.description,
      price,
    });
    return product.product_id;
  }
  const created = await dodo.products.create({
    name: item.name,
    description: item.description,
    tax_category: "saas",
    metadata: { resolvex_key: item.key },
    price,
  });
  return created.product_id;
}

async function main() {
  const meter = await ensureResolutionMeter();
  console.log(`Environment: ${environment}`);
  const ids: Record<string, string> = {};
  for (const item of catalog) {
    ids[item.env] = await ensureProduct(item, meter.id);
    console.log(`${item.env}=${ids[item.env]}`);
  }

  for (const [label, productId, quantity] of [
    ["3 seats monthly", ids.DODO_PAYMENTS_PRODUCT_ID, 3],
    ["3 seats annual", ids.DODO_PAYMENTS_ANNUAL_PRODUCT_ID, 3],
    ["500-minute voice pack", ids.DODO_PAYMENTS_VOICE_PACK_500, 1],
  ] as const) {
    const preview = await dodo.checkoutSessions.preview({
      product_cart: [{ product_id: productId, quantity }],
      billing_address: { country: "US" },
    });
    console.log(
      `${label}: ${preview.currency} ${(preview.total_price / 100).toFixed(2)}`,
      JSON.stringify(
        preview.product_cart.map((line) => ({
          subscription: line.is_subscription,
          meters: line.meters?.map(
            (m) => `${m.name} ${m.price_per_unit}c after ${m.free_threshold}`,
          ),
        })),
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
