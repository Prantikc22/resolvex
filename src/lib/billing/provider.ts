import "server-only";

export type BillingProvider = "paddle" | "razorpay";

export function billingProvider(): BillingProvider {
  return process.env.BILLING_PROVIDER === "paddle" ? "paddle" : "razorpay";
}

export function paddleConfiguration() {
  const apiKey = process.env.PADDLE_API_KEY;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const seatPriceId = process.env.PADDLE_SEAT_PRICE_ID;
  const overagePriceId = process.env.PADDLE_OVERAGE_PRICE_ID;
  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? "production"
      : "sandbox";
  return {
    apiKey,
    clientToken,
    seatPriceId,
    overagePriceId,
    environment,
    configured: Boolean(apiKey && clientToken && seatPriceId),
    usageConfigured: Boolean(overagePriceId),
  };
}

export function billingConfigured() {
  if (billingProvider() === "paddle") return paddleConfiguration().configured;
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_PLAN_ID,
  );
}
