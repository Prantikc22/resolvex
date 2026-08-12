"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BillCalculator } from "@/components/marketing/BillCalculator";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { money, pricing } from "@/lib/pricing";

const included = [
  [
    "Channels",
    [
      "Unlimited email inboxes",
      "Website messenger",
      "Contact forms and API",
      "Branded help center",
      "Human handoff from every conversation",
    ],
  ],
  [
    "AI and knowledge",
    [
      "AI Copilot for every agent",
      "50 AI resolutions each month",
      "Website learning up to 500 pages",
      "25 PDFs, 20 MB each",
      "Source citations and confidence rules",
    ],
  ],
  [
    "Operations",
    [
      "Unlimited free collaborators",
      "Automations and routing",
      "SLAs, CSAT, and quality reports",
      "Customer profiles and history",
      "Standard migration assistance",
    ],
  ],
  [
    "Control",
    [
      "Role-based access",
      "Configurable retention",
      "AI action approvals",
      "Exportable audit history",
      "Human handoff rules",
    ],
  ],
];

const questions = [
  [
    "What counts as a paid agent?",
    "A paid agent can own, reply to, resolve, or call from a conversation. Admins and collaborators who only view, comment internally, or manage knowledge are free.",
  ],
  [
    "What counts as an AI resolution?",
    `A resolution is counted when AI answers and closes the conversation without a human reply. The first ${pricing.includedResolutions} are included each month; additional completed resolutions are ${money(pricing.resolution)} each. Drafts and human handoffs are not billed.`,
  ],
  [
    "How is voice billed?",
    "ResolveX charges a $0.02 platform fee per connected minute. Carrier and phone-number rates are passed through and vary by country. The estimate displays both separately before activation.",
  ],
  [
    "Can we keep data in our own environment?",
    "Dedicated regions, customer-managed storage, SSO, and custom retention are available through an enterprise agreement. The main product remains the same.",
  ],
  [
    "Will you migrate our current helpdesk?",
    "Standard imports for contacts, conversations, and help articles are included. Complex custom migrations are scoped and priced before work begins.",
  ],
  [
    "Does the trial need a card?",
    "The 7-day trial includes the complete product and 50 AI resolutions. Paddle securely authorises a payment method at checkout, and the first subscription charge is due after the trial unless you cancel.",
  ],
];

export function PricingPage() {
  const [open, setOpen] = useState(0);
  return (
    <main className="bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="bg-[#111214] px-4 pb-24 pt-36 text-white sm:px-6 md:pb-32 md:pt-44">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-12 lg:grid-cols-[1fr_.85fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/45">
                <span className="size-1.5 rounded-full bg-[#ff5c35]" />
                One plan. The full product.
              </div>
              <h1 className="mt-6 text-balance text-6xl font-semibold leading-[.9] tracking-[-.065em] md:text-8xl">
                Pricing without
                <br />
                <span className="font-display font-normal italic text-[#d8ff70]">
                  the scavenger hunt.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/52">
                Every channel, workflow, report, and AI Copilot feature is
                included. Full agents cost money. Collaborators do not. AI is
                includes 50 completed resolutions each month, with transparent
                usage pricing after that.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="rounded-[8px] border border-white/12 bg-white/[.045] p-6 sm:p-8"
            >
              <div className="text-xs font-bold uppercase tracking-[.12em] text-[#d8ff70]">
                ResolveX One
              </div>
              <div className="mt-4 font-display text-7xl">
                ${pricing.agent}
                <span className="font-sans text-sm text-white/40">
                  {" "}
                  / agent / month
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm text-white/65">
                {[
                  `${pricing.includedResolutions} AI resolutions included`,
                  `${money(pricing.resolution)} per completed resolution after 50`,
                  "Unlimited collaborators",
                  "No setup fee or annual lock-in",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check size={15} className="text-[#d8ff70]" />
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className="button-bright mt-8 flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] text-sm font-semibold text-white"
              >
                Start 7 days free <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      <section id="calculator" className="px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-12 grid gap-5 lg:grid-cols-2 lg:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
                Run the math
              </div>
              <h2 className="mt-5 text-5xl font-semibold tracking-[-.05em] md:text-7xl">
                Your real bill.
                <br />
                <span className="font-display font-normal italic text-[#777a82]">
                  In seconds.
                </span>
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-[#666970] lg:justify-self-end">
              Change every input. The result updates instantly and separates
              agents, the included AI allowance, and voice usage.
            </p>
          </div>
          <BillCalculator />
        </div>
      </section>
      <section className="bg-white px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
                Included in One
              </div>
              <h2 className="mt-5 text-5xl font-semibold leading-[.95] tracking-[-.05em] md:text-6xl">
                The whole operation.
                <br />
                <span className="font-display font-normal italic text-[#898b91]">
                  Not a starter shell.
                </span>
              </h2>
            </div>
            <div className="grid border-l border-t border-black/10 sm:grid-cols-2">
              {included.map(([category, items]) => (
                <div
                  key={category as string}
                  className="border-b border-r border-black/10 p-6 md:p-8"
                >
                  <h3 className="text-lg font-semibold">
                    {category as string}
                  </h3>
                  <div className="mt-6 space-y-3">
                    {(items as string[]).map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2 text-sm text-[#666970]"
                      >
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-[#4c861f]"
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#c5dcff] px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-3">
          {[
            [
              Sparkles,
              "AI resolution",
              `The first 50 are included. Additional completed resolutions are ${money(pricing.resolution)} each; drafts and human handoffs are not billed.`,
            ],
            [
              Phone,
              "Voice",
              "$0.02 per connected minute plus transparent carrier rates.",
            ],
            [
              ShieldCheck,
              "Enterprise controls",
              "SSO, residency, dedicated storage, and contracts priced separately.",
            ],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof Sparkles;
            return (
              <div
                key={title as string}
                className="border-l border-[#42658f]/20 pl-5"
              >
                <I size={20} />
                <h3 className="mt-8 text-xl font-semibold">
                  {title as string}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#516983]">
                  {copy as string}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="bg-[#f5f4ef] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-[1050px]">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
              Pricing questions
            </div>
            <h2 className="mt-5 text-5xl font-semibold tracking-[-.05em] md:text-6xl">
              Nothing hidden below the fold.
            </h2>
          </div>
          <div className="mt-14 border-t border-black/10">
            {questions.map(([question, answer], index) => (
              <div key={question} className="border-b border-black/10">
                <button
                  onClick={() => setOpen(open === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-5 py-6 text-left text-lg font-semibold"
                >
                  <span>{question}</span>
                  {open === index ? (
                    <Minus size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
                {open === index && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl pb-7 text-sm leading-relaxed text-[#666970]"
                  >
                    {answer}
                  </motion.p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#ff5c35] px-4 py-24 text-center text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-balance text-6xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">
            Run support.
            <br />
            <span className="font-display font-normal italic">
              Not invoices.
            </span>
          </h2>
          <Link
            href="/signup"
            className="mt-10 inline-flex h-16 items-center gap-3 rounded-[6px] bg-white px-8 text-base font-semibold text-[#151619]"
          >
            Start 7 days free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
