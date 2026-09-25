"use client";

import { ArrowRight, Loader2, Mic, PhoneCall } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { money } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type VoiceData = {
  balance: number;
  canPurchase: boolean;
  limits: { startMinimumMinutes: number; suspendBelowMinutes: number };
  packs: Array<{
    id: string;
    minutes: number;
    price: number;
    available: boolean;
  }>;
  history: Array<{
    minutes: number;
    kind: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;
};

/** Prepaid voice minutes: balance, packs and recent activity. */
export function VoicePacksCard() {
  const [data, setData] = useState<VoiceData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/billing/voice-packs", {
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setData(body);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    if (params.get("billing") !== "voice-return" || !paymentId) {
      queueMicrotask(() => void load());
      return;
    }
    params.delete("payment_id");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
    const pending = toast.loading("Confirming your voice minutes…");
    void fetch("/api/billing/voice-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (body.status === "succeeded")
          toast.success(`${body.minutes} voice minutes added.`, {
            id: pending,
            description:
              "Reactivate a voice or phone employee if voice was paused.",
          });
        else
          toast.info(
            "Payment is still processing. Minutes appear as soon as it clears.",
            { id: pending },
          );
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not confirm the payment.",
          { id: pending },
        ),
      )
      .finally(() => void load());
  }, [load]);

  async function buy(pack: string) {
    setBusy(pack);
    try {
      const response = await fetch("/api/billing/voice-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const body = await response.json();
      if (!response.ok || !body.checkoutUrl)
        throw new Error(body.error ?? "Could not start checkout.");
      window.location.assign(body.checkoutUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
      setBusy(null);
    }
  }

  if (!data) return null;
  const low = data.balance < data.limits.suspendBelowMinutes;

  return (
    <section className="mt-5 rounded-[10px] border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[8px] bg-[#eef3ff] text-[#355cff]">
            <Mic size={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold">Voice minutes</h3>
            <p className="mt-0.5 text-[13px] text-[#74777f]">
              Prepaid for website voice and AI phone calls. Minutes never
              expire; calls round up to the next minute.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-3xl font-semibold tabular-nums",
              low && "text-[#b7791f]",
            )}
          >
            {data.balance}
          </div>
          <div className="text-[12px] text-[#858891]">minutes left</div>
        </div>
      </div>

      {low && data.canPurchase && (
        <div className="mt-4 flex items-center gap-2 rounded-[8px] bg-[#fff1c9] px-3 py-2.5 text-[13px] text-[#73520a]">
          <PhoneCall size={14} />
          Voice pauses below {data.limits.suspendBelowMinutes} minutes so a call
          can never outrun your balance. Add a pack to keep it on.
        </div>
      )}
      {!data.canPurchase && (
        <p className="mt-4 rounded-[8px] bg-[#f5f6f8] px-3 py-2.5 text-[13px] text-[#6b6e75]">
          Voice minutes are available on an active paid plan. Trials include
          Arlo text replies only.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {data.packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={!data.canPurchase || !pack.available || busy !== null}
            onClick={() => void buy(pack.id)}
            className="group rounded-[9px] border border-black/10 p-4 text-left transition-colors hover:border-[#355cff]/40 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <div className="text-[13px] font-medium text-[#6b6e75]">
              {pack.minutes.toLocaleString()} minutes
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold">
                {money(pack.price)}
              </span>
              <span className="text-[12px] text-[#858891]">
                {money(pack.price / pack.minutes)}/min
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#355cff]">
              {busy === pack.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : null}
              Buy pack
              <ArrowRight
                size={13}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </button>
        ))}
      </div>

      {data.history.length > 0 && (
        <div className="mt-5 border-t border-black/8 pt-4">
          <div className="text-[12px] font-bold uppercase tracking-[.1em] text-[#92959c]">
            Recent activity
          </div>
          <div className="mt-2 divide-y divide-black/6">
            {data.history.map((row, index) => (
              <div
                key={`${row.created_at}-${index}`}
                className="flex items-center justify-between py-2 text-[13px]"
              >
                <span className="text-[#55585f]">
                  {row.kind === "purchase"
                    ? "Voice pack purchased"
                    : row.kind === "usage"
                      ? "Call"
                      : "Adjustment"}
                  <span className="ml-2 text-[#9a9da4]">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    row.minutes > 0 ? "text-[#3e8218]" : "text-[#17191d]",
                  )}
                >
                  {row.minutes > 0 ? "+" : ""}
                  {row.minutes} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
