"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift } from "lucide-react";
import { useState } from "react";
import { money, pricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type BillingInterval = "month" | "year";

const annualMonthly = pricing.annualSeat / 12;
const yearlySaving = pricing.agent * 12 - pricing.annualSeat;

/** Monthly / annual switch with an animated "two months free" offer. */
export function IntervalToggle({
  value,
  onChange,
  dark = false,
}: {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  dark?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={cn(
        "relative inline-flex items-center rounded-full p-1",
        dark ? "bg-white/10" : "bg-black/[.06]",
      )}
    >
      {(["month", "year"] as const).map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "relative z-10 flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              active
                ? dark
                  ? "text-[#111318]"
                  : "text-white"
                : dark
                  ? "text-white/65"
                  : "text-[#55585f]",
            )}
          >
            {active && (
              <motion.span
                layoutId={dark ? "interval-pill-dark" : "interval-pill"}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "absolute inset-0 -z-10 rounded-full",
                  dark ? "bg-[#d8ff70]" : "bg-[#17191d]",
                )}
              />
            )}
            {option === "month" ? "Monthly" : "Annual"}
            {option === "year" && <FreeMonthsBadge />}
          </button>
        );
      })}
    </div>
  );
}

/** The offer badge gently pulses and shimmers so it is noticed. */
export function FreeMonthsBadge({ className }: { className?: string }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "relative inline-flex items-center gap-1 overflow-hidden rounded-full bg-[#ff5c35] px-2 py-0.5 text-[11px] font-bold text-white",
        className,
      )}
    >
      <Gift size={11} />2 months free
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-0 w-6 -skew-x-12 bg-white/45"
        initial={{ left: "-30%" }}
        animate={{ left: "130%" }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          repeatDelay: 1.6,
          ease: "easeInOut",
        }}
      />
    </motion.span>
  );
}

/** Seat price that animates between the monthly and annual rate. */
export function SeatPrice({
  interval,
  dark = false,
  className,
}: {
  interval: BillingInterval;
  dark?: boolean;
  className?: string;
}) {
  const yearly = interval === "year";
  return (
    <div className={className}>
      <div className="flex items-end gap-3">
        <div className="relative h-[1em] overflow-hidden font-display leading-none">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={interval}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="block"
            >
              {money(yearly ? annualMonthly : pricing.agent)}
            </motion.span>
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {yearly && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "mb-2 font-sans text-xl line-through",
                dark ? "text-white/35" : "text-black/30",
              )}
            >
              {money(pricing.agent)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div
        className={cn(
          "mt-2 font-sans text-sm",
          dark ? "text-white/50" : "text-[#6c6f76]",
        )}
      >
        per agent / month
        {yearly
          ? ` · billed ${money(pricing.annualSeat)} yearly`
          : " · billed monthly"}
      </div>
      <AnimatePresence>
        {yearly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-3 inline-flex rounded-full px-3 py-1 font-sans text-xs font-semibold",
                dark
                  ? "bg-[#d8ff70]/15 text-[#d8ff70]"
                  : "bg-[#dff8bc] text-[#315b13]",
              )}
            >
              You save {money(yearlySaving)} per seat every year
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Self-contained toggle + price, for marketing pages. */
export function PlanPriceWithToggle({
  dark = false,
  defaultInterval = "year",
}: {
  dark?: boolean;
  defaultInterval?: BillingInterval;
}) {
  const [interval, setBillingInterval] =
    useState<BillingInterval>(defaultInterval);
  return (
    <div>
      <IntervalToggle
        value={interval}
        onChange={setBillingInterval}
        dark={dark}
      />
      <SeatPrice
        interval={interval}
        dark={dark}
        className="mt-5 text-6xl md:text-7xl"
      />
    </div>
  );
}
