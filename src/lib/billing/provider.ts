import "server-only";

export type BillingProvider = "dodo" | "razorpay";

export function billingProvider(): BillingProvider {
  return process.env.BILLING_PROVIDER === "razorpay" ? "razorpay" : "dodo";
}

export type DodoEnvironment = "test_mode" | "live_mode";

export function dodoConfiguration() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const environment: DodoEnvironment =
    process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
      ? "live_mode"
      : "test_mode";
  return {
    apiKey,
    productId,
    webhookKey,
    environment,
    configured: Boolean(apiKey && productId),
  };
}

export function billingConfigured() {
  if (billingProvider() === "dodo") return dodoConfiguration().configured;
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_PLAN_ID,
  );
}
