/**
 * Idempotently provisions the ResolveX catalog in Dodo Payments:
 *   - "AI resolutions" and "Voice minutes" usage meters
 *   - the "ResolveX One" subscription product ($15 per seat / month with
 *     50 included resolutions, $0.39 per additional resolution and $0.20 per
 *     connected voice minute)
 * Then previews a 3-seat checkout so the totals can be checked by eye.
 *
 * Usage: npm run dodo:setup            (uses DODO_PAYMENTS_ENVIRONMENT)
 */
import DodoPayments from "dodopayments";

const RESOLUTION_EVENT = "ai.resolution";
const VOICE_EVENT = "voice.minute";
const PRODUCT_KEY = "resolvex_one";

const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is required in .env.local");
const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";
const dodo = new DodoPayments({ bearerToken: apiKey, environment });

async function ensureMeter(
  eventName: string,
  create: DodoPayments.MeterCreateParams,
) {
  for await (const meter of dodo.meters.list()) {
    if (meter.event_name === eventName) return meter;
  }
  return dodo.meters.create(create);
}

function productPrice(resolutionMeterId: string, voiceMeterId: string) {
  return {
    type: "usage_based_price" as const,
    currency: "USD" as const,
    fixed_price: 1500,
    payment_frequency_count: 1,
    payment_frequency_interval: "Month" as const,
    subscription_period_count: 10,
    subscription_period_interval: "Year" as const,
    tax_inclusive: false,
    meters: [
      { meter_id: resolutionMeterId, price_per_unit: "39", free_threshold: 50 },
      { meter_id: voiceMeterId, price_per_unit: "20", free_threshold: 0 },
    ],
  };
}

async function ensureProduct(resolutionMeterId: string, voiceMeterId: string) {
  const price = productPrice(resolutionMeterId, voiceMeterId);
  for await (const product of dodo.products.list()) {
    if (product.metadata?.resolvex_key !== PRODUCT_KEY) continue;
    const full = await dodo.products.retrieve(product.product_id);
    const meters =
      full.price.type === "usage_based_price" ? (full.price.meters ?? []) : [];
    const voice = meters.find((meter) => meter.meter_id === voiceMeterId);
    const current = price.meters.find(
      (meter) => meter.meter_id === voiceMeterId,
    );
    if (
      !voice ||
      Number(voice.price_per_unit) !== Number(current?.price_per_unit)
    ) {
      await dodo.products.update(product.product_id, { price });
      console.log("Updated product meters.");
    }
    return product;
  }
  return dodo.products.create({
    name: "ResolveX One",
    description:
      "AI customer service workspace. Priced per paid agent seat; includes 50 completed AI resolutions each month.",
    tax_category: "saas",
    metadata: { resolvex_key: PRODUCT_KEY },
    price,
  });
}

async function main() {
  const resolutionMeter = await ensureMeter(RESOLUTION_EVENT, {
    name: "AI resolutions",
    description:
      "Completed AI resolutions. Drafts and human handoffs are never sent.",
    event_name: RESOLUTION_EVENT,
    measurement_unit: "resolutions",
    aggregation: { type: "count" },
  });
  const voiceMeter = await ensureMeter(VOICE_EVENT, {
    name: "Voice minutes",
    description: "Connected AI voice minutes, rounded up per call.",
    event_name: VOICE_EVENT,
    measurement_unit: "minutes",
    aggregation: { type: "sum", key: "minutes" },
  });
  const product = await ensureProduct(resolutionMeter.id, voiceMeter.id);
  console.log(`Environment: ${environment}`);
  console.log(`DODO_PAYMENTS_PRODUCT_ID=${product.product_id}`);

  const preview = await dodo.checkoutSessions.preview({
    product_cart: [{ product_id: product.product_id, quantity: 3 }],
    billing_address: { country: "US" },
    subscription_data: { trial_period_days: 7 },
  });
  console.log(
    "3-seat preview:",
    JSON.stringify(
      {
        total_price: preview.total_price,
        currency: preview.currency,
        trial_period_days: preview.trial_period_days,
        recurring: preview.recurring_breakup,
        cart: preview.product_cart,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
