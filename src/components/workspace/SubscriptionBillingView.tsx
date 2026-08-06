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

type Subscription = {
  id: string | null;
  plan: string | null;
  status: string | null;
  agents: number;
  pendingAgents: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  shortUrl: string | null;
};

type BillingResponse = {
  configured?: boolean;
  keyId?: string;
  customer?: { email?: string; name?: string };
  subscription?: Subscription | null;
  requiredAgents?: number;
  usage?: {
    resolutions: number;
    includedResolutions: number;
    billableResolutions: number;
    estimatedOverage: number;
    periodStart: string;
  };
  error?: string;
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
    active: "Active",
    pending: "Payment retry pending",
    halted: "Payment action required",
    cancelled: "Cancelled",
    completed: "Completed",
    expired: "Expired",
    failed: "Payment failed",
  };
  return status ? (labels[status] ?? status) : "Not started";
}

function statusTone(status: string | null) {
  if (status === "active" || status === "authenticated") {
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
}: {
  billingConfigured: boolean;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<BillingResponse["usage"]>();
  const [configured, setConfigured] = useState(billingConfigured);
  const [agents, setAgents] = useState(1);
  const [requiredAgents, setRequiredAgents] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const estimatedTotal = useMemo(() => agents * pricing.agent, [agents]);
  const canEditSeats =
    subscription?.status === "active" ||
    subscription?.status === "authenticated";

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/subscription", {
        cache: "no-store",
      });
      const data = (await response.json()) as BillingResponse;
      if (!response.ok)
        throw new Error(data.error ?? "Could not load billing.");
      setConfigured(Boolean(data.configured));
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
    queueMicrotask(() => void load());
  }, [load]);

  async function verify(response: CheckoutResponse) {
    const verifyResponse = await fetch("/api/billing/subscription/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
    const result = (await verifyResponse.json()) as BillingResponse;
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
        body: JSON.stringify({ agents }),
      });
      const data = (await response.json()) as BillingResponse;
      if (!response.ok)
        throw new Error(data.error ?? "Could not start checkout.");
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
      const data = (await response.json()) as BillingResponse;
      if (!response.ok)
        throw new Error(data.error ?? "Could not update seats.");
      setSubscription(data.subscription ?? null);
      toast.success(
        agents > (subscription?.agents ?? 1)
          ? "Paid seats updated now. Razorpay will apply proration."
          : "Seat decrease scheduled for the next billing cycle.",
      );
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
      const data = (await response.json()) as BillingResponse;
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
            Authorise recurring billing through Razorpay, manage paid seats, and
            cancel at the end of a billing cycle from one place.
          </p>
        </div>

        {!configured && (
          <section className="mt-7 flex flex-col justify-between gap-5 rounded-[10px] border border-[#dbb96d]/45 bg-[#fff7df] p-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold">
                Razorpay Plan ID required
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#766331]">
                Add RAZORPAY_PLAN_ID with a monthly ResolveX One plan before
                enabling checkout. No payment action is available until then.
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
                  <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#858891]">
                    Agents billed monthly
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {money(pricing.agent)}
                    <span className="ml-1 text-xs font-normal text-[#858891]">
                      / agent
                    </span>
                  </div>
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
                  {subscription.pendingAgents} seats scheduled for the next
                  cycle.
                </div>
              )}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[7px] border border-black/8 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#92959c]">
                    Estimated base
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {money(estimatedTotal)}
                    <span className="text-xs font-normal text-[#92959c]">
                      {" "}
                      / month
                    </span>
                  </div>
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
                    {usage?.resolutions ?? 0} / {pricing.includedResolutions}
                  </div>
                  <div className="mt-1 text-[9px] text-[#92959c]">
                    {usage?.billableResolutions
                      ? `${usage.billableResolutions} over · ${money(usage.estimatedOverage)}`
                      : "Included allowance"}
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
                    : "Start 7-day free trial"}
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
                    Monthly recurring subscription
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-xs">
                {[
                  "7 days free before the first billing cycle",
                  "First 50 AI resolutions included",
                  "Razorpay stores and secures payment details",
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
              {canEditSeats && !subscription?.cancelAtPeriodEnd && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel()}
                  className="mt-6 h-10 w-full rounded-[6px] border border-white/12 text-xs font-semibold text-white/62 hover:border-white/25 hover:text-white disabled:opacity-35"
                >
                  Cancel at period end
                </button>
              )}
            </section>

            <section className="rounded-[10px] border border-black/10 bg-white p-5 md:p-6">
              <div className="flex gap-3">
                <ShieldCheck size={18} className="shrink-0 text-[#477d20]" />
                <div>
                  <h3 className="text-sm font-semibold">Payment controls</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#74777f]">
                    ResolveX never receives raw card or mandate details.
                    Checkout authorisation happens on Razorpay, then a signed
                    response and signed webhooks update this workspace.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
