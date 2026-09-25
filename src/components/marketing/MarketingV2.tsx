"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  AtSign,
  BookOpen,
  Bot,
  Check,
  FileText,
  Globe2,
  Inbox,
  Link2,
  Phone,
  Play,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Mark } from "@/components/brand/Logo";
import { BillCalculator } from "@/components/marketing/BillCalculator";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { money, pricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  AttentionSection,
  Counter,
  CrmSection,
  GuardrailsSection,
  IntegrationsSection,
  integrationCount,
  WidgetStudio,
  WorkforceSection,
} from "@/components/marketing/HomeSections";
import { PlanPriceWithToggle } from "@/components/marketing/AnnualOffer";
import { ease, Label, Reveal } from "@/components/marketing/primitives";

const demoConversations = [
  ["AM", "Avery Morgan", "Can I change our billing cycle?", "Now", "#d9ff72"],
  ["SK", "Sana Khan", "SSO metadata is failing", "4m", "#b7d7ff"],
  ["JR", "Jonas Reed", "Webhook delivery failed", "12m", "#ffb49f"],
  ["LP", "Lena Park", "Export my account data", "31m", "#e1c9ff"],
  ["OF", "Omar Farooq", "Thank you for the quick fix", "1h", "#f4df89"],
];

function ProductCanvas() {
  const [draft, setDraft] = useState(false);
  const [resolved, setResolved] = useState(false);
  return (
    <div className="relative h-[610px] overflow-hidden rounded-[8px] border border-black/10 bg-[#111318] shadow-[0_55px_130px_rgba(18,20,28,.25)] sm:h-[680px] lg:h-[720px]">
      <div className="flex h-12 items-center justify-between border-b border-white/8 bg-[#0d0f13] px-4">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-[#ff6b55]" />
          <span className="size-2 rounded-full bg-[#ffd96a]" />
          <span className="size-2 rounded-full bg-[#90e082]" />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/35">
          <span className="size-1.5 rounded-full bg-[#b7f15c]" />
          Live ResolveX workspace
        </div>
      </div>
      <div className="grid h-[calc(100%-3rem)] grid-cols-[58px_1fr] md:grid-cols-[205px_1fr]">
        <aside className="flex flex-col border-r border-white/8 bg-[#0d0f13] p-2.5 text-white md:p-3">
          <div className="flex h-12 items-center gap-2 px-1">
            <Mark className="size-8 bg-white p-1.5" />
            <span className="hidden text-sm font-semibold md:block">
              Acme Care
            </span>
          </div>
          <div className="mt-4 space-y-1">
            {[
              [Inbox, "Inbox", "3"],
              [Bot, "Arlo AI", ""],
              [BookOpen, "Knowledge", ""],
              [Workflow, "Automations", ""],
              [Users, "Customers", ""],
              [Phone, "Voice", ""],
              [Activity, "Reports", ""],
            ].map(([Icon, label, badge], index) => {
              const I = Icon as typeof Inbox;
              return (
                <div
                  key={label as string}
                  className={cn(
                    "flex h-10 items-center rounded-[5px] text-xs",
                    index === 0 ? "bg-white text-[#111318]" : "text-white/42",
                    "justify-center md:justify-start md:gap-3 md:px-3",
                  )}
                >
                  <I size={16} />
                  <span className="hidden md:block">{label as string}</span>
                  {badge && (
                    <span className="ml-auto hidden rounded-full bg-[#ff5c35] px-1.5 py-0.5 text-[9px] font-bold text-white md:block">
                      {badge as string}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-auto hidden rounded-[6px] border border-white/8 p-3 md:block">
            <div className="text-[10px] text-white/30">Resolution rate</div>
            <div className="mt-2 text-xl font-semibold">63.4%</div>
            <div className="mt-2 h-1 rounded-full bg-white/8">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "63%" }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className="h-full rounded-full bg-[#d8ff70]"
              />
            </div>
          </div>
        </aside>
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[270px_1fr] xl:grid-cols-[270px_1fr_250px]">
          <section className="hidden min-h-0 border-r border-white/8 bg-[#12151b] text-white lg:block">
            <div className="border-b border-white/8 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Priority inbox</div>
                  <div className="mt-1 text-[10px] text-white/30">
                    12 open - 3 need attention
                  </div>
                </div>
                <span className="grid size-8 place-items-center rounded-[5px] border border-white/10">
                  <Search size={13} />
                </span>
              </div>
            </div>
            {demoConversations.map(
              ([initials, name, subject, time, color], index) => (
                <div
                  key={name}
                  className={cn(
                    "flex gap-2.5 border-b border-white/7 p-3.5",
                    index === 0 && "bg-white/[.07]",
                  )}
                >
                  <span
                    style={{ background: color }}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#151619]"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-[11px]">
                      <b className="truncate">{name}</b>
                      <span className="text-white/25">{time}</span>
                    </div>
                    <div className="mt-1 truncate text-[10px] text-white/42">
                      {subject}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-white/23">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          index === 1 ? "bg-[#ff6b55]" : "bg-[#d8ff70]",
                        )}
                      />
                      {index === 1 ? "SLA at risk" : "On track"}
                    </div>
                  </div>
                </div>
              ),
            )}
          </section>
          <section className="flex min-w-0 flex-col bg-[#f4f4f1] text-[#16171a]">
            <div className="flex min-h-16 items-center justify-between border-b border-black/8 bg-white px-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Can I change our billing cycle?{" "}
                  <span className="font-mono text-[9px] font-normal text-[#9a9da4]">
                    R-1842
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-[#81858d]">
                  Avery Morgan - Northstar Labs
                </div>
              </div>
              <button
                onClick={() => setResolved(true)}
                className="hidden h-9 items-center gap-1.5 rounded-[5px] bg-[#e7fbc9] px-3 text-[10px] font-semibold text-[#3f741b] sm:flex"
              >
                <Check size={13} />
                {resolved ? "Resolved" : "Resolve"}
              </button>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-2xl">
                <div className="mb-7 flex items-center justify-center gap-3 text-[9px] uppercase tracking-[.1em] text-[#aaa]">
                  <span className="h-px w-12 bg-black/8" />
                  Today
                  <span className="h-px w-12 bg-black/8" />
                </div>
                <div className="max-w-[84%] rounded-[7px] border border-black/8 bg-white p-4 text-xs leading-relaxed shadow-sm">
                  Hi, can we move from monthly to annual billing without losing
                  our current discount?
                  <div className="mt-2 text-[9px] text-[#aaa]">10:42</div>
                </div>
                <div className="my-5 rounded-[7px] border border-[#3b61ff]/14 bg-[#edf1ff] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#3458e8]">
                    <Sparkles size={13} />
                    AI brief - ready in 0.4s
                  </div>
                  <div className="mt-4 grid gap-3 text-[11px] text-[#586174] sm:grid-cols-3">
                    <div>
                      <b className="block text-[#242936]">Intent</b>
                      <span>Billing change</span>
                    </div>
                    <div>
                      <b className="block text-[#242936]">Sentiment</b>
                      <span>Neutral</span>
                    </div>
                    <div>
                      <b className="block text-[#242936]">Confidence</b>
                      <span className="text-[#4f8128]">98%</span>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#3458e8]/10 pt-3 text-[10px] text-[#5f6880]">
                    Cites Billing policy v4 - customer approval required
                  </div>
                </div>
                <AnimatePresence>
                  {draft && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ml-auto max-w-[88%] rounded-[7px] bg-[#15171b] p-4 text-xs leading-relaxed text-white"
                    >
                      Yes. Your current discount carries over, and annual
                      billing adds another 8%. I can prepare the change for your
                      approval now.
                      <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2 text-[9px] text-[#d8ff70]">
                        <ShieldCheck size={11} />
                        Grounded in 2 approved sources
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="border-t border-black/8 bg-white p-3">
              <div className="mx-auto max-w-3xl rounded-[7px] border border-black/10 p-2 shadow-sm">
                <div className="min-h-12 px-2 py-1 text-xs text-[#8b8e95]">
                  {draft ? "Reply ready. Review or send." : "Reply to Avery..."}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <span className="grid size-8 place-items-center text-[#8a8d94]">
                      <AtSign size={14} />
                    </span>
                    <button
                      onClick={() => setDraft(true)}
                      className="flex h-8 items-center gap-1.5 rounded-[4px] bg-[#edf1ff] px-2.5 text-[10px] font-semibold text-[#3458e8]"
                    >
                      <WandSparkles size={13} />
                      {draft ? "Rewrite" : "Write with AI"}
                    </button>
                  </div>
                  <button className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[#15171b] px-3 text-[10px] font-semibold text-white">
                    Send <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          </section>
          <aside className="hidden border-l border-white/8 bg-[#12151b] p-4 text-white xl:block">
            <div className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">
              Customer
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-[#d8ff70] text-xs font-bold text-[#151619]">
                AM
              </span>
              <div>
                <div className="text-sm font-semibold">Avery Morgan</div>
                <div className="mt-1 text-[10px] text-white/30">
                  Northstar Labs
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["Plan", "ResolveX One"],
                ["MRR", "$1,920"],
                ["Health", "92/100"],
                ["Since", "14 mo"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[5px] border border-white/8 p-3"
                >
                  <div className="text-[9px] text-white/25">{label}</div>
                  <div className="mt-2 text-xs font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="my-6 h-px bg-white/8" />
            <div className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">
              Last activity
            </div>
            <div className="mt-4 space-y-4">
              {["Plan upgraded", "Invited 3 teammates", "SSO configured"].map(
                (item, index) => (
                  <div key={item} className="flex gap-2.5 text-[10px]">
                    <span className="mt-1 size-1.5 rounded-full bg-[#b7d7ff]" />
                    <div>
                      <div>{item}</div>
                      <div className="mt-1 text-white/25">
                        {14 + index * 8} days ago
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const heroStats = [
  { to: 5, label: "AI employee roles, ready to hire" },
  { to: integrationCount, suffix: "+", label: "business apps they can use" },
  { to: pricing.includedResolutions, label: "AI resolutions included monthly" },
  {
    to: pricing.agent,
    prefix: "$",
    label: "per agent seat · collaborators free",
  },
];

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const titleY = useTransform(
    scrollYProgress,
    [0, 0.08, 0.2, 1],
    [0, 0, -130, -180],
  );
  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.2, 1],
    [1, 1, 0, 0],
  );
  const dashboardScale = useTransform(
    scrollYProgress,
    [0, 0.12, 0.42, 0.72, 1],
    [0.82, 0.82, 0.9, 0.93, 0.93],
  );
  const dashboardY = useTransform(
    scrollYProgress,
    [0, 0.12, 0.42, 0.72, 1],
    [565, 545, 250, 86, 82],
  );
  const worldScale = useTransform(scrollYProgress, [0, 1], [1.01, 1.07]);
  const worldY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const foregroundOpacity = useTransform(
    scrollYProgress,
    [0, 0.66, 0.86, 1],
    [1, 1, 0.28, 0],
  );

  return (
    <>
      <section
        ref={ref}
        className="relative hidden h-[210svh] min-h-[1500px] bg-[#f5f4ef] md:block"
      >
        <div className="sticky top-0 h-[100svh] min-h-[720px] overflow-hidden">
          <motion.div
            aria-hidden="true"
            style={{
              scale: worldScale,
              y: worldY,
              backgroundImage: "url('/resolvex-world.jpg')",
            }}
            className="absolute inset-0 bg-cover bg-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,244,239,.84)_0%,rgba(245,244,239,.58)_50%,rgba(245,244,239,.16)_100%)]"
          />
          <div className="absolute left-0 top-0 h-2 w-full bg-[#ff5c35]" />

          <motion.div
            style={{ y: titleY, opacity: titleOpacity }}
            className="relative z-30 mx-auto max-w-[1500px] px-6 pt-24 md:pt-26"
          >
            <div className="mx-auto max-w-6xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.08 }}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/88 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md"
              >
                <span className="size-2 rounded-full bg-[#69a834]" />
                AI employees for support and sales
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.14, ease }}
                className="mt-5 text-balance text-[clamp(3.35rem,6.3vw,6.35rem)] font-semibold leading-[.88] tracking-[-.06em]"
              >
                Every customer answered.
                <br />
                <span className="font-display font-normal italic tracking-[-.035em] text-[#ff5c35]">
                  Every lead followed up.
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mx-auto mt-5 max-w-3xl text-balance text-base leading-relaxed text-[#4f535b] md:text-lg"
              >
                ResolveX puts AI employees on your chat, email and phone. They
                resolve support requests, qualify leads and keep your CRM
                current — and hand over to your team the moment a person should
                step in.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mx-auto mt-5 inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-xs font-semibold text-[#3f434b] shadow-sm backdrop-blur-xl"
              >
                7 days free · 50 AI resolutions included · Live in an afternoon
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46 }}
                className="mt-5 flex items-center justify-center gap-3"
              >
                <Link
                  href="/signup"
                  className="button-bright flex h-14 items-center justify-center gap-3 rounded-[6px] bg-[#ff5c35] px-7 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(255,92,53,.28)]"
                >
                  Start free trial <ArrowRight size={18} />
                </Link>
                <Link
                  href="/demo"
                  className="flex h-14 items-center justify-center gap-3 rounded-[6px] border border-black/12 bg-white px-7 text-sm font-semibold hover:border-black/30"
                >
                  <Play size={16} fill="currentColor" />
                  Try the live demo
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            style={{ scale: dashboardScale, y: dashboardY, x: "-50%" }}
            className="absolute left-1/2 top-0 z-40 w-[min(1180px,calc(100vw-6rem))] origin-top [perspective:1800px]"
          >
            <div className="absolute inset-x-8 bottom-[-34px] top-8 rounded-[14px] border border-black/12 bg-[#cbc7be] shadow-[0_70px_150px_rgba(17,20,28,.38)]" />
            <div className="relative z-10 drop-shadow-[0_48px_70px_rgba(19,23,34,.38)]">
              <ProductCanvas />
            </div>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{
              scale: worldScale,
              y: worldY,
              opacity: foregroundOpacity,
              backgroundImage: "url('/resolvex-world.jpg')",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, transparent 82%, rgba(0,0,0,.16) 87%, black 96%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, transparent 82%, rgba(0,0,0,.16) 87%, black 96%, black 100%)",
            }}
            className="pointer-events-none absolute inset-0 z-50 bg-cover bg-center"
          />
        </div>
      </section>

      <section className="relative bg-[#f5f4ef] px-4 pb-12 pt-28 md:hidden">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-[#ff5c35]" />
        <div className="mx-auto max-w-xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold shadow-sm">
            <span className="size-2 rounded-full bg-[#69a834]" />
            AI employees for support and sales
          </div>
          <h1 className="mt-6 text-balance text-[3.25rem] font-semibold leading-[.9] tracking-[-.055em]">
            Every customer answered.
            <br />
            <span className="font-display font-normal italic tracking-[-.025em] text-[#ff5c35]">
              Every lead followed up.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-balance text-[15px] leading-relaxed text-[#555961]">
            ResolveX puts AI employees on your chat, email and phone. They
            resolve support requests, qualify leads and keep your CRM current —
            and hand over to your team the moment a person should step in.
          </p>
          <div className="mt-7 grid gap-3">
            <Link
              href="/signup"
              className="button-bright flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-6 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(255,92,53,.25)]"
            >
              Start free trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="flex h-14 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white px-6 text-sm font-semibold"
            >
              <Play size={14} fill="currentColor" />
              Try the live demo
            </Link>
          </div>
          <div className="mt-4 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold leading-relaxed text-[#4d5159] shadow-sm">
            7 days free · 50 AI resolutions included · Live in an afternoon
          </div>
        </div>
      </section>

      <section className="relative z-[60] bg-[#f5f4ef] px-4 sm:px-6 md:mt-[calc(752px-100svh)]">
        <div className="mx-auto grid max-w-[1380px] overflow-hidden rounded-[7px] border border-black/10 border-t-[#111318] bg-white shadow-[0_18px_45px_rgba(24,28,38,.10)] sm:grid-cols-2 md:border-t-[5px] lg:grid-cols-4">
          {heroStats.map(({ label, ...counter }, index) => (
            <div
              key={label}
              className={cn(
                "p-5 sm:p-6",
                index > 0 && "border-t border-black/10 sm:border-l",
                index === 2 && "lg:border-t-0",
                index === 1 && "sm:border-t-0",
              )}
            >
              <div className="text-4xl font-semibold tracking-[-.05em]">
                <Counter {...counter} />
              </div>
              <div className="mt-1 text-sm text-[#74777e]">{label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function KnowledgeSection() {
  const [mode, setMode] = useState<"site" | "pdf" | "center">("site");
  const narrativeRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: narrativeRef,
    offset: ["start start", "end end"],
  });

  const knowledgeOptions = [
    ["site", Globe2, "Learn from website", "Up to 500 pages"],
    ["pdf", Upload, "Upload documents", "25 PDFs, 20 MB each"],
    ["center", BookOpen, "Publish help center", "Your brand and domain"],
  ] as const;

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const next = progress < 0.34 ? "site" : progress < 0.68 ? "pdf" : "center";
    setMode((current) => (current === next ? current : next));
  });

  function selectMode(next: typeof mode) {
    setMode(next);
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const index = knowledgeOptions.findIndex(([id]) => id === next);
    const start = narrativeRef.current?.getBoundingClientRect().top ?? 0;
    const top = window.scrollY + start;
    const distance = Math.max(
      0,
      (narrativeRef.current?.offsetHeight ?? window.innerHeight) -
        window.innerHeight,
    );
    window.scrollTo({
      top: top + distance * (index / (knowledgeOptions.length - 1)),
      behavior: "smooth",
    });
  }

  return (
    <section
      id="knowledge"
      className="relative bg-[#111214] px-4 py-24 text-white sm:px-6 md:py-36"
    >
      <div className="mx-auto max-w-[1380px]">
        <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <Label light>Knowledge that stays current</Label>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              Teach it once.
              <br />
              <span className="font-display font-normal italic text-[#d8ff70]">
                Every answer learns.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-white/48 lg:justify-self-end">
            Point ResolveX at your public website, upload controlled documents,
            or write an answer directly. No source means no confident answer.
          </p>
        </Reveal>
        <div ref={narrativeRef} className="relative mt-16 lg:h-[220vh]">
          <div className="grid overflow-hidden rounded-[12px] border border-white/12 bg-[#181a1f] shadow-[0_48px_140px_rgba(0,0,0,.38)] lg:sticky lg:top-24 lg:min-h-[620px] lg:grid-cols-[380px_1fr]">
            <div className="relative border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(216,255,112,.08),transparent_48%)] p-3 lg:border-b-0 lg:border-r">
              <div className="hidden px-4 pb-5 pt-4 lg:block">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.14em] text-white/35">
                  <span>Knowledge source</span>
                  <span>
                    {String(
                      knowledgeOptions.findIndex(([id]) => id === mode) + 1,
                    ).padStart(2, "0")}{" "}
                    / 03
                  </span>
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full origin-left rounded-full bg-[#d8ff70]"
                    animate={{
                      scaleX:
                        (knowledgeOptions.findIndex(([id]) => id === mode) +
                          1) /
                        3,
                    }}
                    transition={{ duration: 0.45, ease }}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/38">
                  Scroll to see each source become a controlled, citable answer
                  layer.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {knowledgeOptions.map(([id, Icon, title, copy], index) => {
                  const I = Icon as typeof Globe2;
                  return (
                    <button
                      key={id as string}
                      onClick={() => selectMode(id)}
                      className={cn(
                        "group flex items-center gap-3 rounded-[8px] border p-4 text-left transition-all duration-300",
                        mode === id
                          ? "border-white bg-white text-[#151619] shadow-[0_18px_45px_rgba(0,0,0,.22)]"
                          : "border-transparent text-white/48 hover:border-white/8 hover:bg-white/5 hover:text-white/72",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-[6px]",
                          mode === id ? "bg-[#d8ff70]" : "bg-white/7",
                        )}
                      >
                        <I size={18} />
                      </span>
                      <div>
                        <div
                          className={cn(
                            "mb-1 font-mono text-[9px]",
                            mode === id ? "text-[#66842c]" : "text-white/22",
                          )}
                        >
                          0{index + 1}
                        </div>
                        <div className="text-sm font-semibold">
                          {title as string}
                        </div>
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            mode === id ? "text-[#777a82]" : "text-white/28",
                          )}
                        >
                          {copy as string}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="relative min-h-[520px] overflow-hidden p-5 sm:p-8 lg:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#d8ff70]/5 blur-3xl"
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.42, ease }}
                  className="relative z-10"
                >
                  {mode === "site" && (
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[.12em] text-[#d8ff70]">
                            Website source
                          </div>
                          <h3 className="mt-3 text-3xl font-semibold">
                            acme.com/help
                          </h3>
                        </div>
                        <span className="rounded-[5px] bg-[#d8ff70]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#d8ff70]">
                          Synced 2m ago
                        </span>
                      </div>
                      <div className="mt-10 grid gap-3 sm:grid-cols-3">
                        {[
                          ["Pages indexed", "184"],
                          ["Answers covered", "91%"],
                          ["Changed today", "7"],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-[6px] border border-white/10 p-4"
                          >
                            <div className="text-[10px] text-white/30">
                              {label}
                            </div>
                            <div className="mt-5 text-3xl font-semibold">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 space-y-2">
                        {[
                          "/help/billing/change-plan",
                          "/docs/sso/saml-setup",
                          "/policies/refund-timing",
                          "/help/account/export-data",
                        ].map((path, index) => (
                          <div
                            key={path}
                            className="flex items-center gap-3 rounded-[6px] border border-white/8 bg-black/15 p-3"
                          >
                            <span className="grid size-8 place-items-center rounded-[5px] bg-white/5">
                              <Link2 size={14} />
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/55">
                              {path}
                            </span>
                            <span className="text-[9px] text-[#d8ff70]">
                              {index === 0 ? "Updated" : "Healthy"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {mode === "pdf" && (
                    <div>
                      <div className="mx-auto grid max-w-xl place-items-center rounded-[8px] border border-dashed border-white/20 bg-black/10 px-6 py-16 text-center">
                        <span className="grid size-16 place-items-center rounded-full bg-[#b7d7ff] text-[#15243a]">
                          <FileText size={26} />
                        </span>
                        <h3 className="mt-6 text-2xl font-semibold">
                          Drop approved documents here
                        </h3>
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/42">
                          PDF and text files are extracted, chunked, and kept
                          private to the workspace. Drafts require approval
                          before the AI can cite them.
                        </p>
                        <button className="mt-7 flex h-11 items-center gap-2 rounded-[6px] bg-white px-4 text-xs font-semibold text-[#151619]">
                          <Upload size={15} />
                          Choose files
                        </button>
                        <div className="mt-4 text-[10px] text-white/25">
                          25 files on One - 20 MB per file - 250 MB total
                        </div>
                      </div>
                    </div>
                  )}
                  {mode === "center" && (
                    <div>
                      <div className="rounded-[8px] bg-[#f6f4ed] p-5 text-[#151619] sm:p-7">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mark className="size-8 bg-white p-1.5" />
                            <span className="text-sm font-semibold">
                              Acme Help
                            </span>
                          </div>
                          <span className="text-[10px] text-[#777]">
                            help.acme.com
                          </span>
                        </div>
                        <div className="mx-auto max-w-lg py-14 text-center">
                          <h3 className="font-display text-4xl">
                            How can we help?
                          </h3>
                          <div className="mt-6 flex h-13 items-center gap-3 rounded-[7px] border border-black/10 bg-white px-4 text-sm text-[#898b90] shadow-sm">
                            <Search size={16} />
                            Search or ask a question
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            "Getting started",
                            "Billing and plans",
                            "Account security",
                          ].map((item) => (
                            <div
                              key={item}
                              className="rounded-[6px] border border-black/8 bg-white p-4"
                            >
                              <BookOpen size={16} />
                              <div className="mt-8 text-sm font-semibold">
                                {item}
                              </div>
                              <div className="mt-1 text-[10px] text-[#85878c]">
                                12 articles
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section id="pricing" className="bg-[#f5f4ef] px-4 py-24 sm:px-6 md:py-36">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <Label>One plan, full product</Label>
            <h2 className="mt-5 text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              A bill you can
              <br />
              <span className="font-display font-normal italic text-[#ff5c35]">
                explain aloud.
              </span>
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <PlanPriceWithToggle />
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#666970]">
              Everything is included. The first {pricing.includedResolutions}{" "}
              completed AI resolutions each month are included, then each
              additional completed resolution is {money(pricing.resolution)}.
            </p>
          </div>
        </Reveal>
        <div className="mt-14">
          <BillCalculator />
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-6 text-sm font-semibold text-white"
          >
            Get ResolveX now <ArrowRight size={15} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] border border-black/12 px-6 text-sm font-semibold"
          >
            See limits, voice rates, and every included feature{" "}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function BigCTA() {
  return (
    <section className="bg-[#ff5c35] px-4 py-24 text-white sm:px-6 md:py-36">
      <Reveal className="mx-auto max-w-[1380px] text-center">
        <div className="text-xs font-bold uppercase tracking-[.15em] text-white/60">
          Your first answer can go live today
        </div>
        <h2 className="mx-auto mt-6 max-w-6xl text-balance text-[clamp(3.8rem,8.5vw,8rem)] font-semibold leading-[.87] tracking-[-.07em]">
          Make support feel
          <br />
          <span className="font-display font-normal italic">
            ridiculously fast.
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/72">
          Bring one inbox and one help page. We will help migrate the rest. No
          implementation fee, no sales call, and nothing to pay for 7 days.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="flex h-16 items-center justify-center gap-3 rounded-[6px] bg-white px-8 text-base font-semibold text-[#151619]"
          >
            Start 7 days free <ArrowRight size={18} />
          </Link>
          <Link
            href="/demo"
            className="flex h-16 items-center justify-center gap-3 rounded-[6px] border border-white/35 px-8 text-base font-semibold hover:bg-white/10"
          >
            <Play size={16} fill="currentColor" />
            Use the live demo
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function MarketingV2() {
  return (
    <main className="bg-white">
      <Header />
      <Hero />
      <WorkforceSection />
      <WidgetStudio />
      <KnowledgeSection />
      <CrmSection />
      <AttentionSection />
      <IntegrationsSection />
      <GuardrailsSection />
      <PricingPreview />
      <BigCTA />
      <MarketingFooter cta={false} />
      <ResolveWidget />
    </main>
  );
}
