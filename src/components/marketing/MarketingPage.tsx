"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  Inbox,
  Mail,
  MessageCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Logo, Mark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const spring = { stiffness: 90, damping: 24, mass: 0.8 };

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em]",
        dark ? "text-white/55" : "text-[#616875]",
      )}
    >
      <span
        className={cn("h-px w-7", dark ? "bg-[#c8ff73]" : "bg-[#355cff]")}
      />
      {children}
    </div>
  );
}

const conversations = [
  {
    initials: "AM",
    name: "Avery Morgan",
    subject: "Can I change our billing cycle?",
    time: "Now",
    color: "bg-[#ffb49f]",
    active: true,
  },
  {
    initials: "SK",
    name: "Sana Khan",
    subject: "SSO setup for our team",
    time: "4m",
    color: "bg-[#b9d8ff]",
  },
  {
    initials: "JR",
    name: "Jonas Reed",
    subject: "Webhook delivery failed",
    time: "12m",
    color: "bg-[#d7f9a7]",
  },
  {
    initials: "LP",
    name: "Lena Park",
    subject: "Export my account data",
    time: "31m",
    color: "bg-[#e4c8ff]",
  },
];

function ProductWindow({ compact = false }: { compact?: boolean }) {
  const [sent, setSent] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 7 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[8px] border border-black/10 bg-[#0d1017] text-white shadow-[0_40px_100px_rgba(34,44,82,.2)]",
        compact ? "h-[410px]" : "h-[520px]",
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-white/10 bg-[#121620] px-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#ff735c]" />
          <span className="size-2 rounded-full bg-[#ffd66b]" />
          <span className="size-2 rounded-full bg-[#8ae58b]" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <span className="size-1.5 rounded-full bg-[#c8ff73]" /> Live product
          preview
        </div>
      </div>
      <div className="grid h-[calc(100%-3rem)] grid-cols-[54px_1fr] sm:grid-cols-[190px_1fr]">
        <aside className="border-r border-white/10 bg-[#10141d] p-2 sm:p-3">
          <div className="mb-5 flex items-center gap-2 px-1">
            <Mark className="size-7 bg-white p-[5px]" />
            <span className="hidden text-xs font-semibold sm:block">
              Acme Support
            </span>
          </div>
          {[Inbox, Bot, Workflow, Clock3].map((Icon, index) => (
            <div
              key={index}
              className={cn(
                "mb-1 flex h-9 items-center gap-2 rounded-[5px] px-2 text-xs",
                index === 0 ? "bg-white text-[#101114]" : "text-white/45",
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:block">
                {["Inbox", "Arlo AI", "Automations", "Reports"][index]}
              </span>
            </div>
          ))}
        </aside>
        <div className="grid min-w-0 grid-cols-1 md:grid-cols-[230px_1fr]">
          <div className="hidden border-r border-white/10 bg-[#121720] md:block">
            <div className="border-b border-white/10 p-3">
              <div className="text-xs font-semibold">Priority inbox</div>
              <div className="mt-1 text-[10px] text-white/35">
                12 open · 3 need you
              </div>
            </div>
            {conversations.map((item) => (
              <div
                key={item.name}
                className={cn(
                  "flex gap-2 border-b border-white/7 p-3",
                  item.active && "bg-white/7",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-[#101114]",
                    item.color,
                  )}
                >
                  {item.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[10px]">
                    <b className="truncate">{item.name}</b>
                    <span className="text-white/35">{item.time}</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-white/45">
                    {item.subject}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex min-w-0 flex-col bg-[#f7f8fa] text-[#16191f]">
            <div className="flex items-center justify-between border-b border-black/8 bg-white px-4 py-3">
              <div>
                <div className="text-xs font-semibold">
                  Can I change our billing cycle?
                </div>
                <div className="mt-0.5 text-[10px] text-[#7a808c]">
                  Avery Morgan · acme.co
                </div>
              </div>
              <span className="rounded-[4px] bg-[#eafbd2] px-2 py-1 text-[9px] font-semibold text-[#37750f]">
                AI ready
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-hidden p-4">
              <div className="max-w-[82%] rounded-[6px] border border-black/8 bg-white p-3 text-[11px] leading-relaxed shadow-sm">
                Hi, can we move from monthly to annual billing without losing
                our current discount?
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.05 }}
                className="ml-auto max-w-[88%] rounded-[6px] bg-[#121722] p-3 text-[11px] leading-relaxed text-white"
              >
                Yes. Your current 15% discount carries over, and annual billing
                adds another 8%. I can prepare the change for approval now.
                <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 text-[9px] text-[#c8ff73]">
                  <ShieldCheck size={11} /> Checked against billing policy v4
                </div>
              </motion.div>
              <AnimatePresence>
                {!sent ? (
                  <motion.button
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={() => setSent(true)}
                    className="ml-auto flex items-center gap-2 rounded-[5px] border border-[#355cff]/25 bg-[#edf1ff] px-3 py-2 text-[10px] font-semibold text-[#2449dc]"
                  >
                    <Zap size={12} /> Approve annual switch
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-auto flex items-center gap-2 rounded-[5px] bg-[#eafbd2] px-3 py-2 text-[10px] font-semibold text-[#37750f]"
                  >
                    <CheckCircle2 size={12} /> Change prepared · customer
                    notified
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="m-3 flex h-11 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-3 text-[10px] text-[#8b9099]">
              <Sparkles size={13} className="text-[#355cff]" />
              Reply, ask AI, or run an action
              <span className="ml-auto grid size-7 place-items-center rounded-[5px] bg-[#101114] text-white">
                <Send size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const y = useSpring(rawY, spring);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  return (
    <section
      ref={ref}
      className="page-grid relative overflow-hidden px-4 pb-12 pt-28 md:px-8 md:pb-16 md:pt-32"
    >
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_80%_10%,rgba(150,216,255,.45),transparent_32%),radial-gradient(circle_at_55%_20%,rgba(200,255,115,.28),transparent_28%)]" />
      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto max-w-[1400px]"
      >
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-[5px] border border-black/10 bg-white/70 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4aa31b] opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-[#4aa31b]" />
            </span>
            AI support with a human standard
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-balance text-[clamp(3.2rem,8vw,7.8rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-[#101114]"
          >
            Customer support,
            <br />
            <span className="text-[#355cff]">fully resolved.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-[#565d69] md:text-xl"
          >
            AI resolves the routine and completes the work. Your team gets the
            conversations that deserve a human, with every detail attached.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="button-fill flex h-13 w-full items-center justify-center gap-2 rounded-[6px] bg-[#101114] px-6 text-sm font-semibold text-white sm:w-auto"
            >
              Start free <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[6px] border border-black/14 bg-white px-6 text-sm font-semibold transition hover:border-black/30 sm:w-auto"
            >
              <Play size={15} fill="currentColor" /> Explore the workspace
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-4 text-xs text-[#7a808c]"
          >
            7 days free · Cancel before renewal · Setup in minutes
          </motion.p>
        </div>
        <div className="relative mx-auto mt-14 max-w-6xl [perspective:1800px] md:mt-16">
          <ProductWindow />
        </div>
        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-2 border border-black/10 bg-white/70 backdrop-blur md:grid-cols-4">
          {[
            ["One inbox", "Email, chat and forms"],
            ["AI that acts", "Not just drafts"],
            ["Human handover", "Context stays attached"],
            ["Clear pricing", "No double billing"],
          ].map(([title, copy], index) => (
            <div
              key={title}
              className={cn(
                "p-4 md:p-5",
                index > 0 && "border-l border-black/10",
                index === 2 && "border-l-0 border-t md:border-l md:border-t-0",
                index === 3 && "border-t md:border-t-0",
              )}
            >
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-xs text-[#777e89]">{copy}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

const storySteps = [
  {
    number: "01",
    icon: Inbox,
    title: "Every customer, one continuous thread",
    body: "Email, live chat, forms, and API events arrive in one queue. Identity, account history, and past conversations stay attached.",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI answers from approved knowledge",
    body: "ResolveX retrieves the right policy, shows its sources, and chooses whether to answer, ask a question, or hand over.",
  },
  {
    number: "03",
    icon: Zap,
    title: "The answer can finish the job",
    body: "Connect billing, orders, accounts, and internal tools. The AI can prepare safe actions and route sensitive ones for approval.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Humans keep the final word",
    body: "Set confidence thresholds, protected actions, approval rules, tone, and escalation paths. Every decision stays inspectable.",
  },
];

function ProductStory() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (value) =>
    setActive(Math.min(3, Math.floor(value * 4))),
  );
  return (
    <section
      id="product"
      ref={ref}
      className="bg-white px-4 py-24 md:px-8 md:py-36"
    >
      <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
        <div className="self-start lg:sticky lg:top-28">
          <Eyebrow>One support system</Eyebrow>
          <h2 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
            From first question to finished work.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#666d78]">
            Most AI tools stop after writing an answer. ResolveX carries the
            context through resolution, action, approval, and learning.
          </p>
          <div className="mt-9 hidden grid-cols-4 gap-2 lg:grid">
            {storySteps.map((step, index) => (
              <button
                key={step.number}
                onClick={() => setActive(index)}
                className={cn(
                  "h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]",
                  index === active && "bg-[#355cff]",
                )}
                aria-label={`Show step ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          {storySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.number}
                onViewportEnter={() => setActive(index)}
                viewport={{ margin: "-48% 0px -48%" }}
                animate={{
                  opacity: active === index ? 1 : 0.48,
                  scale: active === index ? 1 : 0.985,
                }}
                transition={{ duration: 0.4 }}
                className="grid min-h-[230px] grid-cols-[auto_1fr] gap-5 rounded-[8px] border border-black/10 bg-[#f7f8fa] p-6 md:min-h-[260px] md:p-9"
              >
                <div
                  className={cn(
                    "grid size-11 place-items-center rounded-[7px] border border-black/10 bg-white",
                    active === index && "bg-[#101114] text-white",
                  )}
                >
                  <Icon size={19} />
                </div>
                <div>
                  <div className="font-mono text-xs text-[#858b95]">
                    {step.number}
                  </div>
                  <h3 className="mt-6 max-w-lg text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-xl leading-relaxed text-[#666d78]">
                    {step.body}
                  </p>
                  {index === 2 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {["Refund order", "Extend trial", "Reset access"].map(
                        (label) => (
                          <span
                            key={label}
                            className="rounded-[4px] border border-[#355cff]/20 bg-[#edf1ff] px-2.5 py-1.5 text-xs font-medium text-[#2449dc]"
                          >
                            {label}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AISection() {
  const [mode, setMode] = useState<"resolve" | "handoff">("resolve");
  return (
    <section
      id="ai"
      className="dark-grid overflow-hidden bg-[#0b0d12] px-4 py-24 text-white md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <Eyebrow dark>AI with boundaries</Eyebrow>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
            <h2 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
              Fast when it knows.
              <br />
              <span className="text-white/35">
                Careful when it doesn&apos;t.
              </span>
            </h2>
            <p className="max-w-xl self-end text-lg leading-relaxed text-white/55">
              Every response is grounded in approved knowledge. Confidence,
              source freshness, customer tier, sentiment, and action risk
              determine what happens next.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
          <Reveal className="rounded-[8px] border border-white/12 bg-[#121620] p-5 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c8ff73]">
                  Decision trace
                </div>
                <h3 className="mt-2 text-2xl font-semibold">
                  Why this conversation{" "}
                  {mode === "resolve" ? "was resolved" : "needs a person"}
                </h3>
              </div>
              <div className="flex rounded-[6px] border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setMode("resolve")}
                  className={cn(
                    "rounded-[4px] px-3 py-2 text-xs",
                    mode === "resolve" && "bg-white text-black",
                  )}
                >
                  Resolved
                </button>
                <button
                  onClick={() => setMode("handoff")}
                  className={cn(
                    "rounded-[4px] px-3 py-2 text-xs",
                    mode === "handoff" && "bg-white text-black",
                  )}
                >
                  Handoff
                </button>
              </div>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {(mode === "resolve"
                ? [
                    ["Policy match", "98%"],
                    ["Source freshness", "2h"],
                    ["Action risk", "Low"],
                  ]
                : [
                    ["Policy match", "71%"],
                    ["Sentiment", "Frustrated"],
                    ["Action risk", "High"],
                  ]
              ).map(([label, value], i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-[6px] border border-white/10 bg-black/15 p-4"
                >
                  <div className="text-xs text-white/40">{label}</div>
                  <div className="mt-5 text-2xl font-semibold">{value}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 rounded-[6px] border border-white/10 bg-black/15 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Decision</span>
                <span
                  className={cn(
                    "rounded-[4px] px-2 py-1 text-xs font-semibold",
                    mode === "resolve"
                      ? "bg-[#c8ff73] text-[#1e3a09]"
                      : "bg-[#ffb49f] text-[#5c170a]",
                  )}
                >
                  {mode === "resolve"
                    ? "Answer + prepare action"
                    : "Route to senior agent"}
                </span>
              </div>
              <div className="mt-6 h-px bg-white/10" />
              <p className="mt-5 text-sm leading-relaxed text-white/55">
                {mode === "resolve"
                  ? "The billing policy directly answers the question. The plan change is reversible and requires customer approval before execution."
                  : "The customer disputes a charge and mentions cancellation. Refund authority exceeds the configured AI limit, so the full context goes to a human."}
              </p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                icon: ShieldCheck,
                title: "Citations on every answer",
                copy: "Agents and customers can inspect the exact source behind a response.",
                color: "bg-[#c8ff73]",
              },
              {
                icon: Workflow,
                title: "Your approval model",
                copy: "Choose which actions run, which need review, and which always stay human.",
                color: "bg-[#96d8ff]",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal
                  key={item.title}
                  delay={i * 0.08}
                  className="rounded-[8px] border border-white/12 bg-[#121620] p-6 md:p-8"
                >
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-[7px] text-[#101114]",
                      item.color,
                    )}
                  >
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-8 text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-white/50">
                    {item.copy}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Channels() {
  const channels = [
    {
      icon: Mail,
      name: "Email",
      copy: "Connect a shared inbox. Threads and replies stay synchronized.",
    },
    {
      icon: MessageCircle,
      name: "Live chat",
      copy: "A fast, brandable widget with identity, history, and proactive messages.",
    },
    {
      icon: Globe2,
      name: "Help center",
      copy: "Publish approved answers with fast search and AI-assisted discovery.",
    },
    {
      icon: Zap,
      name: "API and actions",
      copy: "Read account context and complete safe work in the systems you already use.",
    },
  ];
  return (
    <section id="channels" className="bg-[#eff1f5] px-4 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <Eyebrow>Meet customers where they are</Eyebrow>
          <h2 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
            Different channels.
            <br />
            One memory.
          </h2>
        </Reveal>
        <div className="mt-14 grid border-l border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal
                key={item.name}
                delay={index * 0.06}
                className="group min-h-[300px] border-b border-r border-black/10 bg-white p-6 transition-colors hover:bg-[#101114] hover:text-white md:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-[7px] border border-black/10 bg-[#f5f6f8] text-[#101114]">
                    <Icon size={19} />
                  </span>
                  <ArrowUpRight
                    className="text-[#a1a6af] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                    size={18}
                  />
                </div>
                <h3 className="mt-20 text-2xl font-semibold">{item.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#747a85] group-hover:text-white/55">
                  {item.copy}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-white px-4 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="text-center">
          <Eyebrow>Pricing without guesswork</Eyebrow>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.045em] md:text-6xl">
            Pay for the support you run.
            <br />
            <span className="text-[#8a909a]">Not every person you invite.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#666d78]">
            Unlimited teammates on every plan. The first 50 AI resolutions are
            included, then completed AI resolutions are billed transparently.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {[
            {
              name: "Start",
              price: "₹2,499",
              desc: "For small teams replacing a shared inbox.",
              accent: "bg-[#eef1f5]",
              features: [
                "3 inboxes and live chat",
                "Unlimited teammates",
                "500 AI-assisted replies",
                "Help center and basic reports",
              ],
            },
            {
              name: "Scale",
              price: "₹7,999",
              desc: "For teams ready to automate resolution.",
              accent: "bg-[#101114] text-white",
              featured: true,
              features: [
                "Everything in Start",
                "300 AI resolutions included",
                "Workflows and safe actions",
                "SLAs, CSAT and advanced reports",
              ],
            },
            {
              name: "Control",
              price: "Custom",
              desc: "For regulated or high-volume support.",
              accent: "bg-[#eafbd2]",
              features: [
                "Everything in Scale",
                "Your cloud or dedicated region",
                "SSO, audit exports and BYOK",
                "Custom retention and support",
              ],
            },
          ].map((plan, index) => (
            <Reveal
              key={plan.name}
              delay={index * 0.07}
              className={cn(
                "relative flex min-h-[500px] flex-col rounded-[8px] border border-black/10 p-6 md:p-8",
                plan.accent,
              )}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 rounded-[4px] bg-[#c8ff73] px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-black">
                  Best value
                </span>
              )}
              <div className="text-sm font-semibold">{plan.name}</div>
              <div className="mt-12 text-4xl font-semibold tracking-[-.04em]">
                {plan.price}
                {plan.price.startsWith("₹") && (
                  <span
                    className={cn(
                      "text-sm font-normal",
                      plan.featured ? "text-white/45" : "text-[#777e89]",
                    )}
                  >
                    {" "}
                    / month
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-4 text-sm leading-relaxed",
                  plan.featured ? "text-white/50" : "text-[#6e7580]",
                )}
              >
                {plan.desc}
              </p>
              <div
                className={cn(
                  "my-8 h-px",
                  plan.featured ? "bg-white/12" : "bg-black/10",
                )}
              />
              <div className="space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-3 text-sm">
                    <Check
                      size={16}
                      className={
                        plan.featured ? "text-[#c8ff73]" : "text-[#355cff]"
                      }
                    />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className={cn(
                  "button-fill mt-auto flex h-12 items-center justify-center gap-2 rounded-[6px] border text-sm font-semibold",
                  plan.featured
                    ? "border-white/20 bg-white text-black"
                    : "border-black/15 bg-white text-black",
                )}
              >
                Start free <ArrowRight size={15} />
              </Link>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-[#858b95]">
          Prices exclude applicable taxes. Secure checkout and subscription
          management are provided by our billing partner.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0b0d12] px-4 pb-8 pt-20 text-white md:px-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-12 border-b border-white/10 pb-16 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div>
            <Logo inverse />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/45">
              Customer support that resolves the routine and preserves the human
              moments.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.12em] text-white/35">
              Product
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <a href="#product" className="block hover:text-white">
                Overview
              </a>
              <a href="#ai" className="block hover:text-white">
                AI resolution
              </a>
              <a href="#channels" className="block hover:text-white">
                Channels
              </a>
              <a href="#pricing" className="block hover:text-white">
                Pricing
              </a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.12em] text-white/35">
              Company
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <a
                href="mailto:hello@resolutexhq.com"
                className="block hover:text-white"
              >
                Contact
              </a>
              <Link href="/privacy" className="block hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="block hover:text-white">
                Terms
              </Link>
              <a
                href="https://resolutexhq.com"
                className="block hover:text-white"
              >
                Built by ResoluteX
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-7 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ResolveX. All rights reserved.</span>
          <span>Designed for calm, accountable support.</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPage() {
  return (
    <main className="overflow-clip">
      <Header />
      <Hero />
      <ProductStory />
      <AISection />
      <Channels />
      <Pricing />
      <section className="bg-[#c8ff73] px-4 py-20 md:px-8 md:py-28">
        <Reveal className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-9 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.12em] text-[#466b20]">
              Try the real workspace
            </div>
            <h2 className="mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[.98] tracking-[-.05em] text-[#101114] md:text-6xl">
              Your next customer is already waiting.
            </h2>
          </div>
          <Link
            href="/signup"
            className="flex h-14 shrink-0 items-center gap-3 rounded-[6px] bg-[#101114] px-6 text-sm font-semibold text-white transition hover:bg-[#355cff]"
          >
            Open your workspace <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>
      <Footer />
    </main>
  );
}
