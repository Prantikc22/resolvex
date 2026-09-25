"use client";

import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { FreeMonthsBadge } from "@/components/marketing/AnnualOffer";
import { money, pricing } from "@/lib/pricing";

/** In-app upsell from monthly to annual, with a live saving for the team. */
export function AnnualUpgradeCard({
  seats,
  busy,
  onUpgrade,
}: {
  seats: number;
  busy: boolean;
  onUpgrade: () => void;
}) {
  const saving = (pricing.agent * 12 - pricing.annualSeat) * seats;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative mt-5 overflow-hidden rounded-[12px] bg-[#111318] p-5 text-white md:p-6"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,92,53,.45),transparent)]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <FreeMonthsBadge />
          <h3 className="mt-3 text-xl font-semibold tracking-[-.02em]">
            Switch to annual and save {money(saving)} a year
          </h3>
          <p className="mt-1 text-[13px] text-white/60">
            {money(pricing.annualSeat / 12)} per agent per month instead of{" "}
            {money(pricing.agent)}, billed {money(pricing.annualSeat)} yearly.
            Includes {pricing.includedResolutionsAnnual} AI resolutions a year.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onUpgrade}
          className="button-bright flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#ff5c35] px-5 text-[13px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Switch to annual <ArrowRight size={14} />
        </button>
      </div>
    </motion.section>
  );
}
