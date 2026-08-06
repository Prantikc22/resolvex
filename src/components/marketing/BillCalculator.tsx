"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Minus, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { estimateResolveX, money, pricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function Stepper({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="border-b border-black/10 py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-[#545861]">{label}</span>
        <div className="flex items-center gap-1 rounded-[6px] border border-black/10 bg-white p-1">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            onClick={() => setValue(Math.max(min, value - step))}
            className="grid size-8 place-items-center rounded-[4px] hover:bg-[#f0f1f3]"
          >
            <Minus size={14} />
          </button>
          <span className="w-16 text-center font-mono text-sm font-semibold">
            {value.toLocaleString()}
          </span>
          <button
            type="button"
            aria-label={`Increase ${label}`}
            onClick={() => setValue(Math.min(max, value + step))}
            className="grid size-8 place-items-center rounded-[4px] hover:bg-[#f0f1f3]"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="mt-4 h-1 w-full accent-[#ff5c35]"
      />
    </div>
  );
}

export function BillCalculator({ compact = false }: { compact?: boolean }) {
  const [agents, setAgents] = useState(5);
  const [resolutions, setResolutions] = useState(300);
  const [voiceMinutes, setVoiceMinutes] = useState(400);
  const [currentBill, setCurrentBill] = useState(790);
  const estimate = useMemo(
    () => estimateResolveX(agents, resolutions, voiceMinutes),
    [agents, resolutions, voiceMinutes],
  );
  const savings = Math.max(0, currentBill - estimate.total);
  const annual = savings * 12;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-black/10 bg-[#f7f6f2] shadow-[0_35px_100px_rgba(25,25,30,.09)]",
        compact ? "" : "lg:grid lg:grid-cols-[.9fr_1.1fr]",
      )}
    >
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#ff5c35]">
          <Sparkles size={14} />
          Run your numbers
        </div>
        <h3 className="mt-5 font-display text-4xl leading-none sm:text-5xl">
          Your bill, before checkout.
        </h3>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#666a72]">
          Full agents are paid seats. Collaborators are free. AI is charged only
          when it resolves the conversation.
        </p>
        <div className="mt-6">
          <Stepper
            label="Full support agents"
            value={agents}
            setValue={setAgents}
            min={1}
            max={100}
          />
          <Stepper
            label="AI resolutions / month"
            value={resolutions}
            setValue={setResolutions}
            min={0}
            max={5000}
            step={25}
          />
          <Stepper
            label="Voice minutes / month"
            value={voiceMinutes}
            setValue={setVoiceMinutes}
            min={0}
            max={10000}
            step={100}
          />
          <label className="mt-5 flex items-center justify-between gap-3 text-sm font-medium text-[#545861]">
            <span>Your estimated Intercom monthly bill</span>
            <span className="rounded-[4px] bg-[#eceef2] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b6f78]">
              Editable
            </span>
          </label>
          <div className="mt-2 flex h-12 items-center rounded-[6px] border border-black/10 bg-white px-3">
            <span className="text-[#858992]">$</span>
            <input
              aria-label="Estimated Intercom monthly bill"
              type="number"
              min="0"
              value={currentBill}
              onChange={(event) => setCurrentBill(Number(event.target.value))}
              className="min-w-0 flex-1 bg-transparent px-2 font-mono outline-none"
            />
          </div>
        </div>
      </div>
      <div className="relative flex flex-col bg-[#111214] p-5 text-white sm:p-8 lg:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
              ResolveX One
            </div>
            <div className="mt-3 font-display text-6xl leading-none sm:text-7xl">
              {money(estimate.total)}
            </div>
            <div className="mt-2 text-sm text-white/45">
              per month, before carrier charges
            </div>
          </div>
          <span className="rounded-[5px] bg-[#d8ff70] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#1f3200]">
            All in
          </span>
        </div>
        <div className="mt-8 space-y-3 border-y border-white/10 py-6 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-white/50">
              {agents} agents x {money(pricing.agent)}
            </span>
            <span className="font-mono">{money(estimate.seatCost)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">
              First {pricing.includedResolutions} AI resolutions
            </span>
            <span className="font-mono text-[#d8ff70]">Included</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">After the included allowance</span>
            <span className="font-mono">Human handoff · no overage</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Voice platform usage</span>
            <span className="font-mono">
              {money(estimate.voicePlatformCost)}
            </span>
          </div>
        </div>
        <motion.div
          key={annual}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-[7px] bg-[#d8ff70] p-5 text-[#172000]"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#496800]">
            Estimated annual savings vs Intercom
          </div>
          <div className="mt-2 font-display text-5xl">{money(annual)}</div>
          <p className="mt-2 text-xs leading-relaxed text-[#486000]">
            Compared with the editable Intercom estimate you entered. Verify it
            against your quote or invoice because Intercom packaging changes.
          </p>
        </motion.div>
        <div className="mt-6 grid gap-2 text-xs text-white/65 sm:grid-cols-2">
          {[
            "Unlimited collaborators",
            "Widget and help center",
            "Email and web chat",
            "AI Copilot included",
            "Reports and SLAs",
            "Free standard migration",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <Check size={13} className="text-[#d8ff70]" />
              {item}
            </span>
          ))}
        </div>
        <Link
          href="/signup"
          className="button-bright mt-8 flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] text-sm font-semibold text-white"
        >
          Start 7 days free <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
