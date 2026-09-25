"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { money, pricing } from "@/lib/pricing";
import { VoicePacksCard } from "@/components/workspace/VoicePacksCard";

type Subscription = {
  id: string | null;
  plan: string | null;
  status: string | null;
  agents: number;
  pendingAgents: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  seatPaymentPending: boolean;
  interval?: "month" | "year";
  shortUrl: string | null;
};

type BillingResponse = {
  provider?: "dodo" | "razorpay";
  configured?: boolean;
  annualAvailable?: boolean;
  keyId?: string;
  customer?: { email?: string; name?: string };
  subscription?: Subscription | null;
  requiredAgents?: number;
  usage?: {
    resolutions: number;
    allowanceUsed: number;
    allowanceRemaining: number;
    includedResolutions: number;
    billableResolutions: number;
    estimatedOverage: number;
    periodStart: string;
  };
  error?: string;
  paymentPending?: boolean;
  reused?: boolean;
  chargedImmediately?: boolean;
  environment?: "test_mode" | "live_mode";
  checkoutUrl?: string;
  agents?: number;
};

type CheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: () => void) => void;
};

type RazorpayConstructor = new (
  options: Record<string, unknown>,
) => RazorpayCheckout;

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    created: "Payment setup pending",
    authenticated: "Authorised",
    trialing: "Trial active",
    active: "Active",
    pending: "Payment retry pending",
    past_due: "Payment action required",
    halted: "Payment action required",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    completed: "Completed",
    expired: "Expired",
    failed: "Payment failed",
  };
  return status ? (labels[status] ?? status) : "Not started";
}

function statusTone(status: string | null) {
  if (
    status === "active" ||
    status === "authenticated" ||
    status === "trialing"
  ) {
    return "bg-[#dff8bc] text-[#315b13]";
  }
  if (status === "created") return "bg-[#fff1c9] text-[#73520a]";
  if (status === "pending" || status === "halted" || status === "failed") {
    return "bg-[#ffe1da] text-[#8c2d18]";
  }
  return "bg-white/8 text-white/55";
}

function dateLabel(value: string | null) {
  if (!value) return "Shown after activation";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function loadCheckout() {
  return new Promise<RazorpayConstructor>((resolve, reject) => {
    const current = (window as Window & { Razorpay?: RazorpayConstructor })
      .Razorpay;
    if (current) return resolve(current);

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    const script = existing ?? document.createElement("script");
    const ready = () => {
      const checkout = (window as Window & { Razorpay?: RazorpayConstructor })
        .Razorpay;
      if (checkout) resolve(checkout);
      else reject(new Error("Razorpay Checkout did not load."));
    };
    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Razorpay Checkout could not be loaded.")),
      { once: true },
    );
    if (!existing) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function SubscriptionBillingView({
  billingConfigured,
  activationGate = false,
}: {
  billingConfigured: boolean;
  activationGate?: boolean;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<BillingResponse["usage"]>();
  const [configured, setConfigured] = useState(billingConfigured);
  const [provider, setProvider] = useState<"dodo" | "razorpay">("dodo");
  const [agents, setAgents] = useState(1);
  const [requiredAgents, setRequiredAgents] = useState(1);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [annualAvailable, setAnnualAvailable] = useState(false);
  const [chosenInterval, setChosenInterval] = useState<"month" | "year">(
    "month",
  );
  // An existing subscription fixes the interval; otherwise the toggle decides.
  const interval = subscription?.interval ?? chosenInterval;
  const yearly = interval === "year";
  const seatPrice = yearly ? pricing.annualSeat : pricing.agent;
  const estimatedTotal = useMemo(() => agents * seatPrice, [agents, seatPrice]);
  const canEditSeats =
    subscription?.status === "active" ||
    subscription?.status === "authenticated" ||
    subscription?.status === "trialing";
  const canManageSubscription =
    canEditSeats || subscription?.status === "past_due";

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/subscription", {
        cache: "no-store",
      });
      const data = await billingResponse<BillingResponse>(response);
      if (!response.ok)
        throw new Error(data.error ?? "Could not load billing.");
      setConfigured(Boolean(data.configured));
      setProvider(data.provider ?? "razorpay");
      setTestMode(data.environment === "test_mode");
      setAnnualAvailable(Boolean(data.annualAvailable));
      setSubscription(data.subscription ?? null);
      setUsage(data.usage);
      const minimum = data.requiredAgents ?? 1;
      setRequiredAgents(minimum);
      setAgents(Math.max(data.subscription?.agents ?? 1, minimum));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load billing.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returned = params.get("billing");
    const subscriptionId = params.get("subscription_id");
    if (returned) {
      params.delete("billing");
      params.delete("subscription_id");
      params.delete("status");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    }
    if (returned === "cancelled") {
      toast.info("Checkout was closed. No subscription was started.");
    }
    if (returned !== "return" || !subscriptionId) {
      queueMicrotask(() => void load());
      return;
    }
    // Returning from Dodo checkout: pull the subscription directly so the
    // workspace unlocks without waiting for the webhook.
    const pending = toast.loading("Confirming your subscription…");
    void fetch("/api/billing/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    })
      .then(async (response) => {
        const data = await billingResponse<BillingResponse>(response);
        if (!response.ok)
          throw new Error(data.error ?? "Could not confirm the subscription.");
        const status = data.subscription?.status;
        if (status === "active" || status === "trialing") {
          toast.success("ResolveX One is active. Welcome aboard!", {
            id: pending,
          });
          if (activationGate) {
            window.location.replace("/app");
            return;
          }
        } else {
          toast.info(
            "Payment received. Dodo Payments is still confirming the subscription.",
            { id: pending },
          );
        }
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not confirm the subscription.",
          { id: pending },
        ),
      )
      .finally(() => void load());
  }, [activationGate, load]);

  async function verify(response: CheckoutResponse) {
    const verifyResponse = await fetch("/api/billing/subscription/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
    const result = await billingResponse<BillingResponse>(verifyResponse);
    if (!verifyResponse.ok) {
      throw new Error(result.error ?? "Payment verification failed.");
    }
    toast.success(
      "Subscription authorised. Billing status will update shortly.",
    );
    await load();
  }

  async function startCheckout() {
    setBusy(true);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents, interval: chosenInterval }),
      });
      const data = await billingResponse<BillingResponse>(response);
      if (!response.ok)
        throw new Error(data.error ?? "Could not start checkout.");
      if (data.provider === "dodo") {
        if (data.reused && data.subscription) {
          setSubscription(data.subscription);
          toast.info("This workspace already has an active subscription.");
          setBusy(false);
          return;
        }
        if (!data.checkoutUrl)
          throw new Error("Dodo Payments did not return a checkout link.");
        toast.loading("Opening secure checkout…");
        window.location.assign(data.checkoutUrl);
        return;
      }
      if (!data.subscription?.id || !data.keyId) {
        throw new Error("Razorpay did not return a subscription.");
      }
      setSubscription(data.subscription);
      if (
        data.subscription.status === "active" ||
        data.subscription.status === "authenticated"
      ) {
        toast.info("This workspace already has an authorised subscription.");
        return;
      }

      const Checkout = await loadCheckout();
      const checkout = new Checkout({
        key: data.keyId,
        subscription_id: data.subscription.id,
        name: "ResolveX",
        description: `${agents} agent${agents === 1 ? "" : "s"} · ResolveX One`,
        prefill: data.customer,
        theme: { color: "#ff5c35" },
        handler: (result: CheckoutResponse) => {
          void verify(result)
            .catch((error) =>
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Payment verification failed.",
              ),
            )
            .finally(() => setBusy(false));
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", () => {
        toast.error(
          "Payment authorisation failed. No subscription was activated.",
        );
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
      setBusy(false);
    }
  }

  async function updateSeats() {
    setBusy(true);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents }),
      });
      const data = await billingResponse<BillingResponse>(response);
      if (!response.ok)
        throw new Error(data.error ?? "Could not update seats.");
      setSubscription(data.subscription ?? null);
      if (agents > (subscription?.agents ?? 1)) {
        toast.success(
          provider === "dodo"
            ? "The prorated seat amount was charged and the seat is active."
            : data.paymentPending
              ? "Razorpay is collecting the prorated amount. The seat activates after payment confirmation."
              : "The trial seat is authorised and will be included in the first monthly charge.",
        );
      } else {
        toast.success("Seat decrease scheduled for the next billing cycle.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update seats.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (
      !window.confirm(
        "Cancel this subscription at the end of the current billing cycle?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "DELETE",
      });
      const data = await billingResponse<BillingResponse>(response);
      if (!response.ok)
        throw new Error(data.error ?? "Could not cancel subscription.");
      setSubscription(data.subscription ?? null);
      toast.success("Cancellation scheduled for the end of the billing cycle.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel subscription.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function managePayment() {
    setBusy(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await billingResponse<{ url?: string; error?: string }>(
        response,
      );
      if (!response.ok || !data.url)
        throw new Error(data.error ?? "Could not open payment management.");
      window.location.assign(data.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open payment management.",
      );
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-[#f5f4ef]">
        <Loader2 className="animate-spin text-[#355cff]" />
      </div>
    );
  }

  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            Billing
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
            Subscription and payment
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#74777f]">
            Authorise recurring billing through{" "}
            {provider === "dodo" ? "Dodo Payments" : "Razorpay"}, manage paid
            seats, and cancel at the end of a billing cycle from one place.
          </p>
        </div>

        {configured && testMode && (
          <div className="mt-5 rounded-[8px] border border-[#355cff]/20 bg-[#eef2ff] px-4 py-3 text-xs leading-relaxed text-[#26357a]">
            <strong>Test mode.</strong> No real card is charged. US / USD
            checkout: 4242 4242 4242 4242. India / INR checkout: 4576 2389 1277
            1450 or UPI success@upi. Expiry 06/32, CVC 123.
          </div>
        )}

        {!configured && (
          <section className="mt-7 flex flex-col justify-between gap-5 rounded-[10px] border border-[#dbb96d]/45 bg-[#fff7df] p-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold">
                {provider === "dodo"
                  ? "Dodo Payments product required"
                  : "Razorpay Plan ID required"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#766331]">
                Complete the{" "}
                {provider === "dodo"
                  ? "Dodo Payments API key and product ID (run npm run dodo:setup)"
                  : "Razorpay plan"}{" "}
                configuration before enabling checkout.
              </p>
            </div>
            <span className="shrink-0 rounded-[5px] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#765d20] shadow-sm">
              Setup required
            </span>
          </section>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <section className="overflow-hidden rounded-[10px] border border-black/10 bg-white">
            <div className="border-b border-black/8 p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-[8px] bg-[#17191d] text-[#d8ff70]">
                    <Users size={19} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Paid agent seats</h3>
                    <p className="mt-1 text-[10px] text-[#858891]">
                      Collaborators remain free.
                    </p>
                  </div>
                </div>
                {subscription && (
                  <span
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${statusTone(subscription.status)}`}
                  >
                    {statusLabel(subscription.status)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 md:p-6">
              <div className="flex flex-col justify-between gap-6 rounded-[8px] bg-[#f5f4ef] p-5 sm:flex-row sm:items-center">
                <div>
                  {annualAvailable && !subscription?.interval && (
                    <div className="mb-3 inline-flex rounded-[7px] bg-white p-1 shadow-sm">
                      {(["month", "year"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setChosenInterval(option)}
                          className={`h-8 rounded-[5px] px-3 text-xs font-semibold transition-colors ${
                            chosenInterval === option
                              ? "bg-[#17191d] text-white"
                              : "text-[#6b6e75]"
                          }`}
                        >
                          {option === "month" ? "Monthly" : "Annual · save 20%"}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#858891]">
                    {activationGate
                      ? "Due today"
                      : yearly
                        ? "Agents billed yearly"
                        : "Agents billed monthly"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {money(activationGate ? 0 : seatPrice)}
                    <span className="ml-1 text-xs font-normal text-[#858891]">
                      {activationGate
                        ? " now"
                        : yearly
                          ? " / agent / year"
                          : " / agent"}
                    </span>
                  </div>
                  {activationGate && (
                    <div className="mt-1 text-[10px] text-[#858891]">
                      Billing starts after the seven-day trial.
                    </div>
                  )}
                </div>
                <div className="flex items-center rounded-[7px] border border-black/10 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    aria-label="Remove agent"
                    disabled={busy || agents <= requiredAgents}
                    onClick={() =>
                      setAgents((value) => Math.max(requiredAgents, value - 1))
                    }
                    className="grid size-9 place-items-center rounded-[5px] hover:bg-black/[.04] disabled:opacity-30"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    aria-label="Paid agents"
                    type="number"
                    min={requiredAgents}
                    max={500}
                    value={agents}
                    onChange={(event) =>
                      setAgents(
                        Math.min(
                          500,
                          Math.max(
                            requiredAgents,
                            Number(event.target.value) || requiredAgents,
                          ),
                        ),
                      )
                    }
                    className="h-9 w-14 border-x border-black/8 text-center text-sm font-semibold outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Add agent"
                    disabled={busy || agents >= 500}
                    onClick={() =>
                      setAgents((value) => Math.min(500, value + 1))
                    }
                    className="grid size-9 place-items-center rounded-[5px] hover:bg-black/[.04] disabled:opacity-30"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {subscription?.pendingAgents && (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#6e5c27]">
                  <CalendarClock size={14} />
                  {subscription.seatPaymentPending
                    ? `${subscription.pendingAgents} seats pending payment confirmation.`
                    : `${subscription.pendingAgents} seats scheduled for the next cycle.`}
                </div>
              )}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[7px] border border-black/8 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#92959c]">
                    {activationGate ? "Today" : "Estimated base"}
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {activationGate ? money(0) : money(estimatedTotal)}
                    {!activationGate && (
                      <span className="text-xs font-normal text-[#92959c]">
                        {" "}
                        / {yearly ? "year" : "month"}
                      </span>
                    )}
                  </div>
                  {activationGate && (
                    <div className="mt-1 text-[9px] text-[#92959c]">
                      No charge until the trial ends
                    </div>
                  )}
                </div>
                <div className="rounded-[7px] border border-black/8 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#92959c]">
                    Current period
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {dateLabel(subscription?.currentPeriodEnd ?? null)}
                  </div>
                </div>
                <div className="rounded-[7px] border border-black/8 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#92959c]">
                    AI resolutions
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {usage?.resolutions ?? 0} completed
                  </div>
                  <div className="mt-1 text-[9px] text-[#92959c]">
                    {usage?.billableResolutions
                      ? `${usage.billableResolutions} billable · ${money(usage.estimatedOverage)}`
                      : `${usage?.allowanceRemaining ?? pricing.includedResolutions} included remaining`}
                  </div>
                </div>
              </div>

              {canEditSeats ? (
                <button
                  type="button"
                  disabled={
                    busy ||
                    agents === subscription?.agents ||
                    subscription?.cancelAtPeriodEnd
                  }
                  onClick={() => void updateSeats()}
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[#17191d] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                  Update paid seats
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!configured || busy}
                  onClick={() => void startCheckout()}
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] text-xs font-semibold text-white shadow-[0_12px_28px_rgba(255,92,53,.2)] disabled:cursor-not-allowed disabled:bg-[#c7c8cb] disabled:shadow-none"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                  {subscription?.status === "created"
                    ? "Complete payment setup"
                    : "Start ResolveX One"}
                  {!busy && <ArrowRight size={14} />}
                </button>
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[10px] bg-[#17191d] p-5 text-white md:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[7px] bg-[#d8ff70] text-[#263800]">
                  <CreditCard size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold">ResolveX One</div>
                  <div className="mt-1 text-[10px] text-white/38">
                    {yearly
                      ? "Annual subscription · two months free"
                      : "Monthly recurring subscription"}
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-xs">
                {[
                  "7 days free before the first billing cycle",
                  yearly
                    ? `${pricing.includedResolutionsAnnual} AI resolutions included per year`
                    : `First ${pricing.includedResolutions} AI resolutions included each month`,
                  `${provider === "dodo" ? "Dodo Payments" : "Razorpay"} stores and secures payment details`,
                  provider === "dodo"
                    ? `${money(pricing.resolution)} per completed AI resolution after that`
                    : "Human handoff after the included allowance",
                  "Cancel at the end of the current cycle",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-white/65"
                  >
                    <Check
                      size={14}
                      className="mt-px shrink-0 text-[#d8ff70]"
                    />
                    {item}
                  </div>
                ))}
              </div>
              {subscription?.cancelAtPeriodEnd && (
                <div className="mt-6 rounded-[7px] border border-[#ffcf70]/20 bg-[#ffcf70]/8 p-4 text-xs leading-relaxed text-[#ffe2a9]">
                  Cancellation is scheduled. Access continues through{" "}
                  {dateLabel(subscription.currentPeriodEnd)}.
                </div>
              )}
              {canManageSubscription && !subscription?.cancelAtPeriodEnd && (
                <div className="mt-6 grid gap-2">
                  {provider === "dodo" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void managePayment()}
                      className="h-10 w-full rounded-[6px] bg-white text-xs font-semibold text-[#17191d] disabled:opacity-35"
                    >
                      Manage subscription & invoices
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancel()}
                    className="h-10 w-full rounded-[6px] border border-white/12 text-xs font-semibold text-white/62 hover:border-white/25 hover:text-white disabled:opacity-35"
                  >
                    End subscription at period end
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-[10px] border border-black/10 bg-white p-5 md:p-6">
              <div className="flex gap-3">
                <ShieldCheck size={18} className="shrink-0 text-[#477d20]" />
                <div>
                  <h3 className="text-sm font-semibold">Payment controls</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#74777f]">
                    ResolveX never receives raw card or mandate details.
                    Checkout authorisation happens on{" "}
                    {provider === "dodo" ? "Dodo Payments" : "Razorpay"}, then a
                    signed response and signed webhooks update this workspace.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
        {!activationGate && provider === "dodo" && <VoicePacksCard />}
      </div>
    </div>
  );
}

async function billingResponse<T extends { error?: string }>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {
      error: `Billing returned an empty ${response.status} response. Please retry or contact support.`,
    } as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: `Billing returned an invalid ${response.status} response. Please retry or contact support.`,
    } as T;
  }
}
