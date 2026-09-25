"use client";

import {
  animate,
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  Copy,
  Fingerprint,
  Gauge,
  Globe2,
  Hand,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  PhoneCall,
  Radar,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ease, Label, Reveal } from "@/components/marketing/primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

const apps = [
  ["gmail", "Gmail"],
  ["slack", "Slack"],
  ["hubspot", "HubSpot"],
  ["salesforce", "Salesforce"],
  ["shopify", "Shopify"],
  ["stripe", "Stripe"],
  ["zendesk", "Zendesk"],
  ["intercom", "Intercom"],
  ["freshdesk", "Freshdesk"],
  ["gorgias", "Gorgias"],
  ["pipedrive", "Pipedrive"],
  ["zoho", "Zoho CRM"],
  ["whatsapp", "WhatsApp"],
  ["googlecalendar", "Google Calendar"],
  ["calendly", "Calendly"],
  ["zoom", "Zoom"],
  ["googlemeet", "Google Meet"],
  ["microsoft_teams", "Microsoft Teams"],
  ["outlook", "Outlook"],
  ["notion", "Notion"],
  ["googlesheets", "Google Sheets"],
  ["googledocs", "Google Docs"],
  ["googledrive", "Google Drive"],
  ["one_drive", "OneDrive"],
  ["dropbox", "Dropbox"],
  ["airtable", "Airtable"],
  ["jira", "Jira"],
  ["linear", "Linear"],
  ["github", "GitHub"],
  ["asana", "Asana"],
  ["clickup", "ClickUp"],
  ["trello", "Trello"],
  ["monday", "monday.com"],
  ["mailchimp", "Mailchimp"],
  ["linkedin", "LinkedIn"],
  ["typeform", "Typeform"],
  ["quickbooks", "QuickBooks"],
  ["discord", "Discord"],
  ["telegram", "Telegram"],
  ["supabase", "Supabase"],
] as const;

type AppSlug = (typeof apps)[number][0];
export const integrationCount = apps.length;
const appName = Object.fromEntries(apps) as Record<AppSlug, string>;

function AppLogo({
  slug,
  size = 22,
  className,
}: {
  slug: AppSlug;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const name = appName[slug];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[8px] border border-black/8 bg-white",
        className,
      )}
      style={{ width: size + 14, height: size + 14 }}
      title={name}
    >
      {failed ? (
        <span className="text-[10px] font-bold uppercase text-[#59606c]">
          {name.slice(0, 2)}
        </span>
      ) : (
        // Toolkit marks are served by the same catalog the product uses.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logos.composio.dev/api/${slug}`}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          style={{ width: size, height: size }}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function Counter({
  to,
  prefix = "",
  suffix = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.5,
      ease,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* AI workforce                                                        */
/* ------------------------------------------------------------------ */

type RunStep = { text: string; approval?: boolean };

const roles: {
  name: string;
  short: string;
  mode: "Reactive" | "Scheduled" | "Event-driven";
  trigger: string;
  steps: RunStep[];
  tools: AppSlug[];
  spend: string;
}[] = [
  {
    name: "Arlo Support",
    short: "Support",
    mode: "Reactive",
    trigger: "Web chat · “Where is my order #4821?”",
    steps: [
      { text: "Detected intent: order status · 97% confidence" },
      { text: "Looked up order #4821 in Shopify" },
      { text: "Replied with tracking link and cited source" },
      { text: "Resolved conversation · CSAT survey sent" },
    ],
    tools: ["shopify", "gmail", "zendesk"],
    spend: "$0.02",
  },
  {
    name: "Arlo Receptionist",
    short: "Receptionist",
    mode: "Reactive",
    trigger: "Inbound call · your business number",
    steps: [
      { text: "Answered in the caller’s language" },
      { text: "Checked availability in Google Calendar" },
      { text: "Booked Tuesday 3:30 PM with Dr. Patel" },
      { text: "Sent confirmation on WhatsApp" },
    ],
    tools: ["googlecalendar", "calendly", "whatsapp"],
    spend: "$0.04",
  },
  {
    name: "Arlo Sales",
    short: "Sales",
    mode: "Event-driven",
    trigger: "New lead · pricing page form",
    steps: [
      { text: "Scored lead 82/100 · fits ICP" },
      { text: "Created Qualified deal in HubSpot" },
      { text: "Sent a personalised intro from Gmail" },
      { text: "Scheduled follow-up for Thursday 10:00" },
    ],
    tools: ["hubspot", "gmail", "calendly"],
    spend: "$0.03",
  },
  {
    name: "Arlo Customer Success",
    short: "Success",
    mode: "Scheduled",
    trigger: "Every Monday · 9:00 AM",
    steps: [
      { text: "Found 6 accounts with falling usage" },
      { text: "Flagged 2 renewals at risk in the CRM" },
      { text: "Drafted six check-in emails" },
      { text: "Bulk send waiting for your approval", approval: true },
    ],
    tools: ["intercom", "slack", "gmail"],
    spend: "$0.06",
  },
  {
    name: "Custom employee",
    short: "Custom",
    mode: "Event-driven",
    trigger: "Webhook · refund.requested",
    steps: [
      { text: "Checked order history and refund policy" },
      { text: "Refund $120 is above the $50 auto-limit" },
      { text: "Manager approved in Slack", approval: true },
      { text: "Refund issued in Stripe · customer notified" },
    ],
    tools: ["stripe", "slack", "notion"],
    spend: "$0.05",
  },
];

const modeIcon = {
  Reactive: Zap,
  Scheduled: CalendarClock,
  "Event-driven": Webhook,
};

export function WorkforceSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-120px" });
  const [state, setState] = useState({ role: 0, step: 0 });
  const [autoplay, setAutoplay] = useState(true);
  const role = roles[state.role];

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => {
      setState(({ role: current, step }) => {
        if (step < roles[current].steps.length + 4)
          return { role: current, step: step + 1 };
        return autoplay
          ? { role: (current + 1) % roles.length, step: 0 }
          : { role: current, step };
      });
    }, 720);
    return () => window.clearInterval(id);
  }, [autoplay, inView]);

  const choose = (index: number) => {
    setAutoplay(false);
    setState({ role: index, step: 0 });
  };
  const done = state.step > role.steps.length;
  const ModeIcon = modeIcon[role.mode];

  return (
    <section
      ref={ref}
      id="employees"
      className="relative overflow-hidden bg-[#0b0d11] px-4 py-24 text-white sm:px-6 md:py-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,92,53,.18),transparent)]"
      />
      <div className="relative mx-auto max-w-[1380px]">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <Label light>AI workforce</Label>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              Hire AI employees,
              <br />
              <span className="font-display font-normal italic text-[#ff8064]">
                not another chatbot.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-white/62 lg:justify-self-end">
            Give each employee a role, the apps it may use, a budget and the
            moments that need a human. Activate it, close your laptop, and it
            keeps working — on chats, calls, emails, schedules and webhooks.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {roles.map((item, index) => {
              const active = index === state.role;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => choose(index)}
                  className={cn(
                    "relative min-w-[190px] overflow-hidden rounded-[10px] border px-5 py-4 text-left transition-colors lg:min-w-0",
                    active
                      ? "border-white/20 bg-white/[.07]"
                      : "border-white/8 bg-transparent hover:bg-white/[.04]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "text-base font-semibold",
                        active ? "text-white" : "text-white/55",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55">
                      {item.mode}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-white/40">
                    {item.trigger}
                  </div>
                  {active && (
                    <motion.span
                      key={`${state.role}-${autoplay}`}
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[#ff5c35]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: autoplay ? 1 : 0 }}
                      transition={{
                        duration: autoplay
                          ? ((item.steps.length + 5) * 720) / 1000
                          : 0,
                        ease: "linear",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-white/10 bg-[#12151b] shadow-[0_40px_120px_rgba(0,0,0,.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[9px] bg-[#ff5c35]">
                  <Bot size={19} />
                </span>
                <div>
                  <div className="text-base font-semibold">{role.name}</div>
                  <div className="text-sm text-white/40">
                    Run #{2481 + state.role} · started by trigger
                  </div>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-[#d8ff70]/25 bg-[#d8ff70]/10 px-3 py-1.5 text-xs font-semibold text-[#d8ff70]">
                <ModeIcon size={13} /> {role.mode}
              </span>
            </div>

            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 rounded-[8px] border border-dashed border-white/15 px-4 py-3 text-sm text-white/70">
                <Radar size={15} className="shrink-0 text-[#96d8ff]" />
                <span className="text-white/40">Trigger</span>
                <span className="truncate">{role.trigger}</span>
              </div>

              <ol className="mt-5 space-y-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {role.steps.map((step, index) => {
                    if (state.step < index) return null;
                    const running = state.step === index;
                    return (
                      <motion.li
                        key={`${state.role}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease }}
                        className={cn(
                          "flex items-center gap-3 rounded-[8px] px-4 py-3 text-[15px]",
                          step.approval
                            ? "border border-[#ffcf70]/25 bg-[#ffcf70]/8"
                            : "bg-white/[.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full",
                            running
                              ? "bg-white/10"
                              : step.approval
                                ? "bg-[#ffcf70] text-[#3b2a00]"
                                : "bg-[#d8ff70] text-[#1d2a00]",
                          )}
                        >
                          {running ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : step.approval ? (
                            <Hand size={12} />
                          ) : (
                            <Check size={13} strokeWidth={3} />
                          )}
                        </span>
                        <span className="text-white/85">{step.text}</span>
                        {step.approval && !running && (
                          <span className="ml-auto hidden rounded-[5px] bg-[#ffcf70] px-2 py-1 text-[11px] font-semibold text-[#3b2a00] sm:inline">
                            Human approval
                          </span>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>

              <div className="mt-6 grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-3">
                <Meter
                  label="AI spend"
                  value={done ? role.spend : "…"}
                  hint="of $2.00 run budget"
                  fill={done ? 0.1 : 0.04}
                />
                <Meter
                  label="Tool calls"
                  value={`${Math.min(state.step, role.steps.length)} / 12`}
                  hint="hard cap per run"
                  fill={Math.min(state.step, role.steps.length) / 12}
                />
                <div className="rounded-[8px] bg-white/[.04] p-3">
                  <div className="text-xs text-white/40">Apps used</div>
                  <div className="mt-2 flex gap-1.5">
                    {role.tools.map((tool) => (
                      <AppLogo key={tool} slug={tool} size={16} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Reactive",
              copy: "Runs the moment a chat, call, email, CRM change or webhook arrives.",
            },
            {
              icon: CalendarClock,
              title: "Scheduled",
              copy: "Follow-ups due in two days still happen — even when nobody is logged in.",
            },
            {
              icon: Webhook,
              title: "Event-driven autonomous",
              copy: "Multi-step work after a trigger, bounded by tools, time and spend.",
            },
          ].map(({ icon: Icon, title, copy }, index) => (
            <Reveal
              key={title}
              delay={index * 0.06}
              className="bg-[#0f1216] p-6 md:p-7"
            >
              <Icon size={20} className="text-[#ff8064]" />
              <div className="mt-4 text-lg font-semibold">{title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {copy}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Meter({
  label,
  value,
  hint,
  fill,
}: {
  label: string;
  value: string;
  hint: string;
  fill: number;
}) {
  return (
    <div className="rounded-[8px] bg-white/[.04] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-[#96d8ff]"
          animate={{ width: `${Math.max(4, fill * 100)}%` }}
          transition={{ duration: 0.5, ease }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-white/30">{hint}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sales CRM                                                           */
/* ------------------------------------------------------------------ */

const stages = ["New lead", "Qualified", "Proposal", "Won"];
const lifecycle = ["Lead", "MQL", "SQL", "Opportunity", "Customer"];
const stageScore = [46, 71, 84, 97];
const pipeline = [
  [
    ["Globex", "$6,200"],
    ["Initech", "$3,900"],
  ],
  [["Umbrella", "$11,000"]],
  [
    ["Stark Retail", "$24,500"],
    ["Hooli", "$8,800"],
  ],
  [["Wayne & Co", "$15,000"]],
];

export function CrmSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-140px" });
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(
      () => setStage((value) => (value + 1) % stages.length),
      2100,
    );
    return () => window.clearInterval(id);
  }, [inView]);

  const score = stageScore[stage];
  const circumference = 2 * Math.PI * 34;

  return (
    <section
      ref={ref}
      id="crm"
      className="bg-[#f5f4ef] px-4 py-24 sm:px-6 md:py-36"
    >
      <div className="mx-auto max-w-[1380px]">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <Label>Sales CRM</Label>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              A CRM that
              <br />
              <span className="font-display font-normal italic text-[#85878d]">
                updates itself.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-[#666970] lg:justify-self-end">
            Every chat, email and call lands on the right contact. Leads are
            scored with a calibrated confidence, deals move through your
            pipeline, and sequences follow up on time — with or without Arlo
            Sales doing the legwork.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <Reveal className="overflow-hidden rounded-[14px] border border-black/10 bg-white p-4 shadow-[0_30px_80px_rgba(20,22,28,.08)] md:p-5">
            <div className="flex items-center justify-between px-1 pb-4">
              <div className="text-base font-semibold">Pipeline · Q4</div>
              <div className="flex items-center gap-2 text-sm text-[#7a7d85]">
                <span className="size-2 animate-pulse rounded-full bg-[#2fa55a]" />
                Live
              </div>
            </div>
            <LayoutGroup>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {stages.map((name, column) => (
                  <div
                    key={name}
                    className={cn(
                      "min-h-[250px] rounded-[10px] p-2.5 transition-colors duration-500",
                      column === stage ? "bg-[#fff1ec]" : "bg-[#f6f6f3]",
                    )}
                  >
                    <div className="flex items-center justify-between px-1 pb-2.5 text-[13px] font-semibold text-[#55585f]">
                      {name}
                      <span className="text-[#a0a3a9]">
                        {pipeline[column].length + (column === stage ? 1 : 0)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {column === stage && (
                        <motion.div
                          layoutId="hero-deal"
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 28,
                          }}
                          className="rounded-[8px] border border-[#ff5c35]/40 bg-white p-3 shadow-[0_12px_30px_rgba(255,92,53,.18)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              Northwind
                            </span>
                            <span className="rounded-full bg-[#ff5c35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {score}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] text-[#6b6e75]">
                            $18,400 · Arlo Sales
                          </div>
                        </motion.div>
                      )}
                      {pipeline[column].map(([company, value]) => (
                        <motion.div
                          layout
                          key={company}
                          className="rounded-[8px] border border-black/8 bg-white p-3"
                        >
                          <div className="text-sm font-semibold">{company}</div>
                          <div className="mt-1 text-[13px] text-[#8b8e95]">
                            {value}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </LayoutGroup>
          </Reveal>

          <Reveal
            delay={0.08}
            className="flex flex-col rounded-[14px] bg-[#111318] p-5 text-white md:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="relative size-[84px] shrink-0">
                <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="rgba(255,255,255,.1)"
                    strokeWidth="7"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#d8ff70"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{
                      strokeDashoffset: circumference * (1 - score / 100),
                    }}
                    transition={{ duration: 0.9, ease }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-xl font-semibold tabular-nums">
                  {score}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">Dana Whitfield</div>
                <div className="text-sm text-white/45">
                  VP Ops · Northwind · EMEA territory
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs font-semibold uppercase tracking-[.12em] text-white/35">
              Lifecycle
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {lifecycle.map((item, index) => (
                <span
                  key={item}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[13px] transition-colors duration-500",
                    index <= stage + 1
                      ? "bg-[#d8ff70] text-[#1d2a00]"
                      : "bg-white/8 text-white/40",
                  )}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-6 text-xs font-semibold uppercase tracking-[.12em] text-white/35">
              Sequence · Enterprise trial
            </div>
            <ol className="mt-3 space-y-2">
              {[
                [Mail, "Day 1 · Intro email from template"],
                [PhoneCall, "Day 3 · Call task for owner"],
                [Mail, "Day 7 · Case study follow-up"],
              ].map(([Icon, text], index) => {
                const I = Icon as typeof Mail;
                return (
                  <li
                    key={text as string}
                    className="flex items-center gap-3 text-[15px] text-white/75"
                  >
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full",
                        index < stage
                          ? "bg-[#d8ff70] text-[#1d2a00]"
                          : "bg-white/8 text-white/50",
                      )}
                    >
                      {index < stage ? (
                        <Check size={13} strokeWidth={3} />
                      ) : (
                        <I size={13} />
                      )}
                    </span>
                    {text as string}
                  </li>
                );
              })}
            </ol>
            <div className="mt-auto pt-6 text-sm leading-relaxed text-white/45">
              Deal insight: champion replied within 2h · 3 stakeholders engaged
            </div>
          </Reveal>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            "Kanban pipeline",
            "Lifecycle stages",
            "Contact scoring",
            "Custom fields",
            "Email templates",
            "Sales sequences",
            "Territories & ownership",
            "Deal insights",
            "Custom activities",
            "CRM-triggered flows",
            "Works with HubSpot, Salesforce & Pipedrive",
          ].map((item, index) => (
            <Reveal key={item} delay={index * 0.025}>
              <span className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm text-[#3c3f45]">
                <Check size={14} className="text-[#ff5c35]" />
                {item}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Attention brief + decision layer                                    */
/* ------------------------------------------------------------------ */

const attention: {
  source: AppSlug;
  who: string;
  text: string;
  label: string;
  confidence: number;
  action: string;
  tone: string;
}[] = [
  {
    source: "gmail",
    who: "Priya · Acme Retail",
    text: "Our invoice doubled this month — can someone explain?",
    label: "Billing",
    confidence: 98,
    action: "Open thread",
    tone: "bg-[#ffe1da] text-[#8c2d18]",
  },
  {
    source: "slack",
    who: "#sales · Marco",
    text: "Northwind asked for security docs before Friday.",
    label: "Sales",
    confidence: 91,
    action: "Create task",
    tone: "bg-[#dff8bc] text-[#315b13]",
  },
  {
    source: "googlemeet",
    who: "Discovery call · Hooli",
    text: "Agreed to send a proposal and loop in their CFO.",
    label: "Follow-up",
    confidence: 94,
    action: "2 tasks created",
    tone: "bg-[#dbe7ff] text-[#23408e]",
  },
  {
    source: "gmail",
    who: "Leo · Stark Retail",
    text: "Can’t log in after SSO change, whole team blocked.",
    label: "Urgent · Technical",
    confidence: 96,
    action: "Escalate",
    tone: "bg-[#fff1c9] text-[#73520a]",
  },
];

export function AttentionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const probability = 0.92;

  return (
    <section id="attention" className="bg-white px-4 py-24 sm:px-6 md:py-36">
      <div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
        <Reveal>
          <Label>Attention brief</Label>
          <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-6xl">
            Your morning,
            <br />
            <span className="font-display font-normal italic text-[#85878d]">
              already triaged.
            </span>
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#666970]">
            ResolveX reads connected Gmail, Slack and meeting notes live — no
            mailbox copies — and tells you the five things that matter today.
            Every label comes from a decision engine with a calibrated
            confidence score, not a guess dressed up as a number.
          </p>
          <div className="mt-8 grid gap-3 text-[15px] sm:grid-cols-2">
            {[
              [Target, "Intent routing: billing, technical, sales"],
              [Gauge, "Confidence drives auto-approve thresholds"],
              [ListChecks, "Zoom, Meet & Teams calls become tasks"],
              [Mail, "Inbound email auto-labelled by customer"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Target;
              return (
                <div key={text as string} className="flex items-start gap-2.5">
                  <I size={17} className="mt-0.5 shrink-0 text-[#ff5c35]" />
                  {text as string}
                </div>
              );
            })}
          </div>
        </Reveal>

        <div ref={ref} className="space-y-4">
          <div className="relative overflow-hidden rounded-[14px] border border-black/10 bg-[#fbfbf9] p-4 md:p-5">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Sparkles size={16} className="text-[#ff5c35]" />
                Needs your attention today
              </div>
              <span className="text-sm text-[#8b8e95]">4 of 212 messages</span>
            </div>
            {inView && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,92,53,.08),transparent)]"
                initial={{ top: "-20%" }}
                animate={{ top: "110%" }}
                transition={{
                  duration: 2.4,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 1.6,
                }}
              />
            )}
            <div className="space-y-2">
              {attention.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: 24 }}
                  animate={inView ? { opacity: 1, x: 0 } : undefined}
                  transition={{
                    duration: 0.55,
                    delay: 0.25 + index * 0.18,
                    ease,
                  }}
                  className="flex items-start gap-3 rounded-[10px] border border-black/8 bg-white p-3.5"
                >
                  <AppLogo slug={item.source} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{item.who}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          item.tone,
                        )}
                      >
                        {item.label} · {item.confidence}%
                      </span>
                    </div>
                    <p className="mt-1 text-[15px] leading-snug text-[#55585f]">
                      {item.text}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 self-center rounded-[6px] bg-[#17191d] px-2.5 py-1.5 text-xs font-semibold text-white sm:flex">
                    {item.action} <ArrowRight size={12} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 1.1, ease }}
            className="rounded-[14px] bg-[#111318] p-5 text-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[15px]">
                <span className="text-white/45">Decision · </span>
                Is this $38 refund safe to auto-approve?
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : undefined}
                transition={{ delay: 2.4, type: "spring" }}
                className="flex items-center gap-1.5 rounded-full bg-[#d8ff70] px-2.5 py-1 text-xs font-semibold text-[#1d2a00]"
              >
                <BadgeCheck size={13} /> Auto-approved
              </motion.span>
            </div>
            <div className="relative mt-4 h-3 rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#96d8ff,#d8ff70)]"
                initial={{ width: 0 }}
                animate={
                  inView ? { width: `${probability * 100}%` } : undefined
                }
                transition={{ duration: 1.2, delay: 1.3, ease }}
              />
              <div className="absolute -top-1.5 bottom-[-6px] left-[85%] w-px bg-white/70" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/40">
              <span>p = {probability.toFixed(2)}</span>
              <span>Your threshold 0.85 · under $50</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Widget studio                                                       */
/* ------------------------------------------------------------------ */

const swatches = ["#ff5c35", "#355cff", "#138a4c", "#7c3aed", "#111318"];

export function WidgetStudio() {
  const [color, setColor] = useState(swatches[0]);
  const [name, setName] = useState("Aria");
  const [side, setSide] = useState<"left" | "right">("right");
  const [voice, setVoice] = useState(true);
  const snippet =
    '<script src="https://www.getresolvex.com/resolvex-widget.js" data-workspace="YOUR_WORKSPACE_KEY" async></script>';
  const displayName = name.trim() || "Assistant";

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Install snippet copied");
    } catch {
      toast.error("Copy failed — select the snippet instead.");
    }
  }

  return (
    <section id="widget" className="bg-[#eef3ff] px-4 py-24 sm:px-6 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <Label>Chat, voice and phone</Label>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              Your brand.
              <br />
              <span className="font-display font-normal italic text-[#4f617a]">
                Your assistant’s name.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-[#4f617a] lg:justify-self-end">
            One assistant across chat, voice and phone. Change its colours,
            logo, name, greeting and position in minutes, then install with one
            line. Try it here.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal className="rounded-[14px] border border-black/10 bg-white p-5 md:p-6">
            <label
              className="block text-sm font-semibold"
              htmlFor="studio-name"
            >
              Assistant name
            </label>
            <input
              id="studio-name"
              value={name}
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-black/12 px-3 text-[15px] outline-none focus:border-[#355cff] focus:ring-4 focus:ring-[#355cff]/10"
            />
            <div className="mt-5 text-sm font-semibold">Brand colour</div>
            <div className="mt-2 flex gap-2">
              {swatches.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use colour ${swatch}`}
                  onClick={() => setColor(swatch)}
                  className={cn(
                    "size-10 rounded-full border-2 transition-transform active:scale-90",
                    color === swatch
                      ? "scale-110 border-white ring-2 ring-black/70"
                      : "border-white",
                  )}
                  style={{ background: swatch }}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-semibold">Position</div>
                <div className="mt-2 flex rounded-[8px] bg-[#f1f2f4] p-1">
                  {(["left", "right"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSide(value)}
                      className={cn(
                        "h-9 flex-1 rounded-[6px] text-sm capitalize transition-colors",
                        side === value
                          ? "bg-white font-semibold shadow-sm"
                          : "text-[#6b6e75]",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold">Voice</div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={voice}
                  onClick={() => setVoice((value) => !value)}
                  className={cn(
                    "mt-2 flex h-11 w-full items-center justify-between rounded-[8px] px-3 text-sm transition-colors",
                    voice
                      ? "bg-[#17191d] text-white"
                      : "bg-[#f1f2f4] text-[#6b6e75]",
                  )}
                >
                  {voice ? "Talk to AI on" : "Off"}
                  <Mic size={15} />
                </button>
              </div>
            </div>
            <div className="mt-6 text-sm font-semibold">Install</div>
            <div className="mt-2 flex items-start gap-2 rounded-[8px] bg-[#111318] p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[12px] leading-relaxed text-[#d8ff70]">
                {snippet}
              </code>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy install snippet"
                className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-white/10 text-white transition-transform hover:bg-white/15 active:scale-90"
              >
                <Copy size={14} />
              </button>
            </div>
          </Reveal>

          <Reveal
            delay={0.08}
            className="relative min-h-[520px] overflow-hidden rounded-[14px] border border-black/10 bg-white"
          >
            <div className="flex h-10 items-center gap-1.5 border-b border-black/8 bg-[#f7f7f5] px-4">
              <span className="size-2.5 rounded-full bg-[#ff6b55]" />
              <span className="size-2.5 rounded-full bg-[#ffd96a]" />
              <span className="size-2.5 rounded-full bg-[#90e082]" />
              <span className="ml-3 rounded-full bg-white px-3 py-0.5 text-xs text-[#8b8e95]">
                yourbrand.com
              </span>
            </div>
            <div className="space-y-3 p-6 opacity-60" aria-hidden="true">
              <div className="h-7 w-2/5 rounded bg-[#ececea]" />
              <div className="h-3 w-4/5 rounded bg-[#f1f1ef]" />
              <div className="h-3 w-3/5 rounded bg-[#f1f1ef]" />
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 rounded-[8px] bg-[#f4f4f2]" />
                ))}
              </div>
            </div>

            <motion.div
              layout
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className={cn(
                "absolute bottom-5 w-[min(310px,calc(100%-2.5rem))] overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(20,22,28,.18)]",
                side === "right" ? "right-5" : "left-5",
              )}
            >
              <motion.div
                animate={{ backgroundColor: color }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 px-4 py-3.5 text-white"
              >
                <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">
                    {displayName}
                  </div>
                  <div className="text-xs text-white/75">
                    Replies instantly · humans on standby
                  </div>
                </div>
              </motion.div>
              <div className="space-y-2.5 p-4">
                <div className="max-w-[85%] rounded-[12px] rounded-tl-[4px] bg-[#f1f2f4] px-3 py-2 text-sm">
                  Hi! I’m {displayName}. Ask me anything about your order.
                </div>
                <div
                  className="ml-auto max-w-[80%] rounded-[12px] rounded-tr-[4px] px-3 py-2 text-sm text-white"
                  style={{ background: color }}
                >
                  Can I change my delivery address?
                </div>
                <div className="max-w-[85%] rounded-[12px] rounded-tl-[4px] bg-[#f1f2f4] px-3 py-2 text-sm">
                  Yes — until it ships. I’ve updated order #4821 for you.
                </div>
              </div>
              <div className="flex gap-2 border-t border-black/8 p-3">
                <AnimatePresence initial={false}>
                  {voice && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
                    >
                      <motion.span
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="size-2 rounded-full"
                        style={{ background: color }}
                      />
                      Talk to AI
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold">
                  <Users size={12} /> Request a person
                </span>
              </div>
            </motion.div>
          </Reveal>
        </div>

        <div className="mt-5 grid gap-px overflow-hidden rounded-[14px] border border-black/10 bg-black/10 md:grid-cols-3">
          {[
            {
              icon: Mic,
              title: "Talk on your website",
              copy: "Visitors tap “Talk to AI” and speak with your assistant in the browser — interruptions, transcripts and all.",
            },
            {
              icon: PhoneCall,
              title: "Answer your phone line",
              copy: "Connect the number you already own from Twilio, Plivo, Exotel, Vonage or any SIP carrier. AI picks up at 3 a.m.",
            },
            {
              icon: Mail,
              title: "Email and one inbox",
              copy: "Chats, emails and calls land in one priority inbox with the transcript and CRM context attached.",
            },
          ].map(({ icon: Icon, title, copy }, index) => (
            <Reveal
              key={title}
              delay={index * 0.06}
              className="bg-white p-6 md:p-7"
            >
              <span className="grid size-11 place-items-center rounded-[10px] bg-[#eef3ff] text-[#355cff]">
                <Icon size={19} />
              </span>
              <div className="mt-4 text-lg font-semibold">{title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#5b6170]">
                {copy}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Integrations                                                        */
/* ------------------------------------------------------------------ */

export function IntegrationsSection() {
  const half = Math.ceil(apps.length / 2);
  const rows = [apps.slice(0, half), apps.slice(half)];
  return (
    <section
      id="integrations"
      className="overflow-hidden bg-white py-24 md:py-36"
    >
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <Label>Integrations</Label>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
              <Counter to={apps.length} />+ apps.
              <br />
              <span className="font-display font-normal italic text-[#85878d]">
                One set of permissions.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-[#666970] lg:justify-self-end">
            Connect the tools you already pay for with secure OAuth. Reading is
            instant; anything that sends, spends or deletes waits for approval
            until you decide otherwise.
          </p>
        </Reveal>
      </div>
      <div className="mt-14 space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="marquee-mask overflow-hidden">
            <div
              className={cn(
                "flex w-max gap-3",
                rowIndex === 0 ? "logo-marquee" : "logo-marquee-reverse",
              )}
            >
              {[...row, ...row].map(([slug, name], index) => (
                <div
                  key={`${slug}-${index}`}
                  className="flex items-center gap-3 rounded-[12px] border border-black/8 bg-[#fafaf8] py-3 pl-3 pr-5"
                >
                  <AppLogo slug={slug} size={22} />
                  <span className="whitespace-nowrap text-[15px] font-semibold text-[#2b2d31]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-[1380px] flex-wrap justify-center gap-2 px-4 sm:px-6">
        {[
          "Help desks",
          "CRMs",
          "Email & chat",
          "Calendars & meetings",
          "Commerce & payments",
          "Docs & storage",
          "Project management",
          "Webhooks & API",
        ].map((item) => (
          <span
            key={item}
            className="rounded-full bg-[#f1f2f4] px-3.5 py-2 text-sm text-[#55585f]"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Guardrails                                                          */
/* ------------------------------------------------------------------ */

export function GuardrailsSection() {
  const items = [
    {
      icon: Hand,
      title: "Approval gates",
      copy: "Sending, refunding or deleting waits for a person — or a confidence threshold you set.",
    },
    {
      icon: CircleDollarSign,
      title: "Spend limits",
      copy: "Per-run AI budgets and monthly usage caps. Nothing runs past its allowance.",
    },
    {
      icon: TimerReset,
      title: "Timeouts & retries",
      copy: "Durable jobs with idempotency, retries and recovery — no browser tab required.",
    },
    {
      icon: ScrollText,
      title: "Full audit log",
      copy: "Every tool call, argument and result recorded, with secrets redacted.",
    },
    {
      icon: Fingerprint,
      title: "Tenant isolation",
      copy: "Row-level security on every table. Workspaces never see each other’s data.",
    },
    {
      icon: ShieldCheck,
      title: "Grounded answers",
      copy: "Arlo answers only from knowledge you approved, and cites it.",
    },
  ];
  return (
    <section
      id="guardrails"
      className="bg-[#0b0d11] px-4 py-24 text-white sm:px-6 md:py-36"
    >
      <div className="mx-auto max-w-[1380px]">
        <Reveal className="text-center">
          <div className="flex justify-center">
            <Label light>Autonomy with guardrails</Label>
          </div>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
            Let AI do the work.
            <br />
            <span className="font-display font-normal italic text-[#d8ff70]">
              Keep every decision yours.
            </span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[14px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, copy }, index) => (
            <Reveal
              key={title}
              delay={(index % 3) * 0.06}
              className="group bg-[#0f1216] p-6 transition-colors hover:bg-[#141821] md:p-8"
            >
              <motion.span
                whileHover={{ rotate: -8, scale: 1.08 }}
                className="grid size-11 place-items-center rounded-[10px] bg-white/[.06] text-[#d8ff70]"
              >
                <Icon size={20} />
              </motion.span>
              <div className="mt-5 text-xl font-semibold">{title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {copy}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/45">
          {[
            [Lock, "Encrypted secrets"],
            [Globe2, "Help center on your own domain"],
            [Clock3, "Human handoff in one click"],
            [MessageCircle, "Human takeover stops the AI"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Lock;
            return (
              <span key={text as string} className="flex items-center gap-2">
                <I size={15} className="text-white/60" />
                {text as string}
              </span>
            );
          })}
        </Reveal>
        <div className="mt-12 flex justify-center">
          <Link
            href="/security"
            className="flex h-12 items-center gap-2 rounded-[8px] border border-white/15 px-5 text-sm font-semibold transition-colors hover:bg-white/8"
          >
            Read how we secure ResolveX <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
