"use client";

import { motion } from "framer-motion";
import { PhoneCall, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function CallCustomerDialog({
  customer,
  initialNumber = "",
  onClose,
}: {
  customer: string;
  initialNumber?: string | null;
  onClose: () => void;
}) {
  const [number, setNumber] = useState(initialNumber ?? "");
  const [consent, setConsent] = useState(false);
  const dialNumber = useMemo(() => number.replace(/[^+\d]/g, ""), [number]);
  const canCall = dialNumber.replace(/\D/g, "").length >= 7 && consent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-[#080a0d]/72 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={`Call ${customer}`}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] overflow-hidden rounded-[18px] border border-white/12 bg-[#15171c] text-white shadow-[0_36px_120px_rgba(0,0,0,.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-white/8 px-6 pb-6 pt-5">
          <div className="absolute -right-14 -top-20 size-48 rounded-full bg-[#ff5c35]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#d8ff70]">
                Direct call
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-.035em]">
                Call {customer}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-white/45">
                Start from this conversation and keep the customer context in
                view.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close call dialog"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.05] text-white/55 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <label className="text-[10px] font-bold uppercase tracking-[.11em] text-white/35">
            Customer phone
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/[.045] px-4 focus-within:border-[#d8ff70]/45 focus-within:ring-4 focus-within:ring-[#d8ff70]/6">
            <PhoneCall size={17} className="text-[#d8ff70]" />
            <input
              autoFocus
              type="tel"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="+1 415 555 0142"
              className="h-13 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/20"
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[10px] border border-white/8 bg-white/[.025] p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 size-4 accent-[#d8ff70]"
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <ShieldCheck size={13} className="text-[#d8ff70]" />
                Customer consent confirmed
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/35">
                Recording remains off unless your connected provider and policy
                explicitly enable it.
              </span>
            </span>
          </label>

          <a
            href={canCall ? `tel:${dialNumber}` : undefined}
            aria-disabled={!canCall}
            onClick={(event) => {
              if (!canCall) {
                event.preventDefault();
                return;
              }
              toast.success(`Opening a call to ${customer}`);
            }}
            className={
              canCall
                ? "mt-5 flex h-13 items-center justify-center gap-2 rounded-[9px] bg-[#ff5c35] text-sm font-semibold text-white shadow-[0_16px_38px_rgba(255,92,53,.24)]"
                : "mt-5 flex h-13 cursor-not-allowed items-center justify-center gap-2 rounded-[9px] bg-white/8 text-sm font-semibold text-white/28"
            }
          >
            <PhoneCall size={16} />
            Start call
          </a>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-white/28">
            Opens the calling app connected to this device. Browser-based
            provider calls remain available from Voice setup.
          </p>
        </div>
      </motion.section>
    </motion.div>
  );
}
