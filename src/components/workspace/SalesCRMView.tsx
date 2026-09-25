"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SalesView =
  "contacts" | "pipeline" | "sequences" | "activities" | "tasks";

type CrmData = {
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
    lifecycle_stage: string;
    lead_score: number;
    territory: string | null;
    custom_fields: Record<string, unknown>;
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage: string;
    amount_minor: number;
    currency: string;
    probability: number;
    next_step: string | null;
    territory: string | null;
    insights: Record<string, unknown>;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
    source: string;
  }>;
  activities: Array<{
    id: string;
    activity_type: string;
    title: string;
    summary: string | null;
    occurred_at: string;
  }>;
  appointments: Array<{
    id: string;
    title: string;
    starts_at: string;
    status: string;
    external_provider: string | null;
  }>;
  sequences: Array<{
    id: string;
    name: string;
    status: string;
    audience_stage: string;
    template_subject: string;
    steps: unknown[];
  }>;
  enrollments: Array<{
    id: string;
    sequence_id: string;
    contact_id: string;
    status: string;
    current_step: number;
    next_step_at: string | null;
  }>;
};

const stages = [
  "New",
  "Qualified",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];
const lifecycle = [
  "subscriber",
  "lead",
  "marketing_qualified",
  "sales_qualified",
  "opportunity",
  "customer",
  "evangelist",
  "other",
];

function pretty(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function SalesCRMView({
  mode,
  onNavigate,
}: {
  mode: SalesView;
  onNavigate?: (view: string) => void;
}) {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/crm", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) toast.error(result.error ?? "Could not load CRM");
    else setData(result);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const titles: Record<SalesView, [string, string]> = {
    contacts: [
      "Contacts",
      "Lifecycle, score, ownership, and every customer channel in one tenant-safe record.",
    ],
    pipeline: [
      "Pipeline",
      "Move opportunities through a practical Kanban and keep the next action visible.",
    ],
    sequences: [
      "Sequences",
      "Create reusable sales follow-ups. Activation stays behind connected email and approval policy.",
    ],
    activities: [
      "Activities",
      "A verified timeline of email, chat, calls, meetings, notes, and sales work.",
    ],
    tasks: [
      "Tasks",
      "The durable work queue for people, AI employees, calls, meetings, and Flows.",
    ],
  };
  const [title, copy] = titles[mode];
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f1e8] p-4 text-[#15171b] md:p-7">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6f747d]">
              {mode === "tasks" ? "Operations" : "ResolveX CRM"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#717680]">
              {copy}
            </p>
          </div>
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-[6px] bg-[#15171b] px-4 text-xs font-semibold text-white"
          >
            <Plus size={14} />{" "}
            {mode === "pipeline"
              ? "New deal"
              : mode === "sequences"
                ? "New sequence"
                : mode === "activities"
                  ? "Log activity"
                  : mode === "tasks"
                    ? "New task"
                    : "New contact"}
          </button>
        </div>

        {mode !== "tasks" && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric
              icon={UserRound}
              label="Contacts"
              value={String(data?.contacts.length ?? 0)}
            />
            <Metric
              icon={CircleDollarSign}
              label="Open pipeline"
              value={formatMoney(
                (data?.deals ?? [])
                  .filter((deal) => !["Won", "Lost"].includes(deal.stage))
                  .reduce((sum, deal) => sum + Number(deal.amount_minor), 0),
                "USD",
              )}
            />
            <Metric
              icon={Clock3}
              label="Open follow-ups"
              value={String(
                (data?.tasks ?? []).filter(
                  (task) => !["completed", "cancelled"].includes(task.status),
                ).length,
              )}
            />
          </div>
        )}

        {open && (
          <CreatePanel
            mode={mode}
            contacts={data?.contacts ?? []}
            onClose={() => setOpen(false)}
            onSaved={load}
            saving={saving}
            setSaving={setSaving}
          />
        )}

        {loading && (
          <div className="mt-6 animate-pulse rounded-[10px] bg-white p-12 text-center text-sm text-[#747982]">
            Loading workspace CRM…
          </div>
        )}
        {!loading && data && mode === "contacts" && (
          <Contacts
            data={data}
            query={query}
            setQuery={setQuery}
            onReload={load}
          />
        )}
        {!loading && data && mode === "pipeline" && (
          <Pipeline data={data} onReload={load} />
        )}
        {!loading && data && mode === "sequences" && (
          <Sequences data={data} onReload={load} onNavigate={onNavigate} />
        )}
        {!loading && data && mode === "activities" && (
          <Activities data={data} onNavigate={onNavigate} />
        )}
        {!loading && data && mode === "tasks" && (
          <Tasks data={data} onReload={load} />
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[9px] border border-black/8 bg-white p-4">
      <Icon size={16} className="text-[#355cff]" />
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] text-[#858a92]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Contacts({
  data,
  query,
  setQuery,
  onReload,
}: {
  data: CrmData;
  query: string;
  setQuery: (value: string) => void;
  onReload: () => Promise<void>;
}) {
  const filtered = data.contacts.filter((contact) =>
    `${contact.name} ${contact.email ?? ""} ${contact.territory ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function update(id: string, body: Record<string, unknown>) {
    const response = await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contact", id, ...body }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onReload();
  }
  async function refreshScore(id: string) {
    const response = await fetch("/api/crm/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contact", id }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    toast.success("Lead score refreshed from current CRM signals");
    await onReload();
  }
  return (
    <section className="mt-5 overflow-hidden rounded-[10px] border border-black/10 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-black/8 p-4">
        <div className="relative min-w-64 flex-1">
          <Search size={14} className="absolute left-3 top-3 text-[#858a92]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts, email, or territory"
            className="h-10 w-full rounded-[6px] border border-black/10 pl-9 pr-3 text-xs"
          />
        </div>
        <span className="text-xs text-[#777c85]">
          {filtered.length} contacts
        </span>
      </div>
      <div className="hidden grid-cols-[1.5fr_1fr_1fr_110px] gap-3 border-b border-black/7 bg-[#f7f7f4] px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#7b8089] md:grid">
        <span>Contact</span>
        <span>Lifecycle</span>
        <span>Territory</span>
        <span>Score</span>
      </div>
      {filtered.map((contact) => (
        <div
          key={contact.id}
          className="grid gap-3 border-b border-black/7 p-4 md:grid-cols-[1.5fr_1fr_1fr_110px] md:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d8ff70] text-xs font-bold">
              {contact.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div className="min-w-0">
              <b className="block truncate text-sm">{contact.name}</b>
              <span className="block truncate text-xs text-[#7b8089]">
                {contact.email ?? contact.phone ?? "No verified identifier"}
              </span>
            </div>
          </div>
          <select
            value={contact.lifecycle_stage}
            onChange={(event) =>
              void update(contact.id, { lifecycleStage: event.target.value })
            }
            className="h-10 rounded-[6px] border border-black/10 px-2 text-xs"
          >
            {lifecycle.map((stage) => (
              <option key={stage} value={stage}>
                {pretty(stage)}
              </option>
            ))}
          </select>
          <input
            defaultValue={contact.territory ?? ""}
            onBlur={(event) =>
              void update(contact.id, { territory: event.target.value || null })
            }
            placeholder="Unassigned"
            className="h-10 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <div>
            <div className="flex items-center justify-between text-xs">
              <b>{contact.lead_score}</b>
              <button
                type="button"
                onClick={() => void refreshScore(contact.id)}
                className="text-[9px] font-semibold text-[#355cff]"
              >
                AI refresh
              </button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7e9ee]">
              <div
                className="h-full bg-[#355cff]"
                style={{ width: `${contact.lead_score}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      {!filtered.length && (
        <Empty
          title="No matching contacts"
          copy="Create one manually or let an identified conversation create the customer record."
        />
      )}
    </section>
  );
}

function Pipeline({
  data,
  onReload,
}: {
  data: CrmData;
  onReload: () => Promise<void>;
}) {
  async function move(id: string, stage: string) {
    const response = await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deal", id, stage }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onReload();
  }
  async function refreshInsight(id: string) {
    const response = await fetch("/api/crm/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deal", id }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    toast.success("Deal posture refreshed from current CRM evidence");
    await onReload();
  }
  return (
    <div className="mt-5 overflow-x-auto pb-3">
      <div className="grid min-w-[1260px] grid-cols-7 gap-3">
        {stages.map((stage) => {
          const deals = data.deals.filter((deal) => deal.stage === stage);
          return (
            <section
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                if (id) void move(id, stage);
              }}
              className="min-h-[430px] rounded-[10px] border border-black/8 bg-white/60 p-3"
            >
              <div className="flex items-center justify-between">
                <b className="text-xs">{stage}</b>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] text-[#747982]">
                  {deals.length}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#858a92]">
                {formatMoney(
                  deals.reduce(
                    (sum, deal) => sum + Number(deal.amount_minor),
                    0,
                  ),
                  deals[0]?.currency ?? "USD",
                )}
              </p>
              <div className="mt-3 space-y-2">
                {deals.map((deal) => (
                  <article
                    key={deal.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/plain", deal.id)
                    }
                    className="cursor-grab rounded-[8px] border border-black/8 bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <b className="block text-xs leading-5">{deal.title}</b>
                    <p className="mt-2 text-sm font-semibold">
                      {formatMoney(Number(deal.amount_minor), deal.currency)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[9px] text-[#7b8089]">
                      <span>{deal.probability}% probability</span>
                      <span>{deal.territory ?? "No territory"}</span>
                    </div>
                    {Boolean(deal.insights?.posture) && (
                      <p className="mt-2 rounded-[5px] bg-[#eef1ff] px-2 py-1 text-[9px] font-semibold text-[#355cff]">
                        AI posture: {pretty(String(deal.insights.posture))}
                      </p>
                    )}
                    {deal.next_step && (
                      <p className="mt-3 border-t border-black/7 pt-2 text-[10px] leading-4 text-[#666d76]">
                        Next: {deal.next_step}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void refreshInsight(deal.id);
                      }}
                      className="mt-3 text-[9px] font-semibold text-[#355cff]"
                    >
                      Refresh deal insight
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Sequences({
  data,
  onReload,
  onNavigate,
}: {
  data: CrmData;
  onReload: () => Promise<void>;
  onNavigate?: (view: string) => void;
}) {
  async function toggle(id: string, status: string) {
    const response = await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "sequence", id, status }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onReload();
  }
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        {data.sequences.map((sequence) => {
          const enrolled = data.enrollments.filter(
            (item) => item.sequence_id === sequence.id,
          );
          return (
            <article
              key={sequence.id}
              className="rounded-[10px] border border-black/10 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{sequence.name}</h3>
                    <span className="rounded-full bg-[#eef0f4] px-2 py-1 text-[9px] font-bold capitalize">
                      {sequence.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#777c85]">
                    Audience: {pretty(sequence.audience_stage)} ·{" "}
                    {sequence.steps.length} configured step(s) ·{" "}
                    {enrolled.length} enrolled
                  </p>
                  {sequence.template_subject && (
                    <p className="mt-3 rounded-[6px] bg-[#f5f6f7] p-3 text-xs">
                      {sequence.template_subject}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    void toggle(
                      sequence.id,
                      sequence.status === "active" ? "paused" : "active",
                    )
                  }
                  className="h-9 rounded-[5px] bg-[#15171b] px-3 text-[10px] font-semibold text-white"
                >
                  {sequence.status === "active" ? "Pause" : "Activate"}
                </button>
              </div>
            </article>
          );
        })}
        {!data.sequences.length && (
          <Empty
            title="No sequences yet"
            copy="Create a sequence with an email template, then connect Gmail and add approval rules before activation."
          />
        )}
      </section>
      <aside className="rounded-[10px] bg-[#15171b] p-5 text-white">
        <Sparkles size={18} className="text-[#d8ff70]" />
        <h3 className="mt-5 text-lg font-semibold">One automation engine</h3>
        <p className="mt-2 text-xs leading-5 text-white/50">
          Sequences own reusable sales touches. Flows own triggers, waits,
          approvals, retries, and CRM-stage events—so there is no second hidden
          workflow engine.
        </p>
        <button
          onClick={() => onNavigate?.("flows")}
          className="mt-5 flex h-10 w-full items-center justify-between rounded-[6px] border border-white/12 px-3 text-xs"
        >
          Configure Flows <ArrowRight size={13} />
        </button>
        <button
          onClick={() => onNavigate?.("integrations")}
          className="mt-2 flex h-10 w-full items-center justify-between rounded-[6px] border border-white/12 px-3 text-xs"
        >
          Connect Gmail <ArrowRight size={13} />
        </button>
      </aside>
    </div>
  );
}

function Activities({
  data,
  onNavigate,
}: {
  data: CrmData;
  onNavigate?: (view: string) => void;
}) {
  const icon = (type: string) =>
    type === "email"
      ? Mail
      : type === "call"
        ? Phone
        : type === "meeting"
          ? Video
          : type === "message"
            ? MessageSquareText
            : Activity;
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
      <section className="overflow-hidden rounded-[10px] border border-black/10 bg-white">
        {data.activities.map((item) => {
          const Icon = icon(item.activity_type);
          return (
            <div
              key={item.id}
              className="flex gap-3 border-b border-black/7 p-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[7px] bg-[#eef1ff] text-[#355cff]">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-xs">{item.title}</b>
                  <span className="text-[9px] text-[#858a92]">
                    {new Date(item.occurred_at).toLocaleString()}
                  </span>
                </div>
                {item.summary && (
                  <p className="mt-2 text-xs leading-5 text-[#777c85]">
                    {item.summary}
                  </p>
                )}
                <span className="mt-2 inline-block text-[9px] font-bold uppercase tracking-[.08em] text-[#355cff]">
                  {item.activity_type}
                </span>
              </div>
            </div>
          );
        })}
        {!data.activities.length && (
          <Empty
            title="No sales activity yet"
            copy="Log a note, email, call, or meeting. Connected channels can also append verified activity."
          />
        )}
      </section>
      <aside className="space-y-3">
        <div className="rounded-[10px] border border-black/10 bg-white p-5">
          <Video size={18} className="text-[#355cff]" />
          <h3 className="mt-4 font-semibold">Meeting follow-up</h3>
          <p className="mt-2 text-xs leading-5 text-[#777c85]">
            Connect Zoom, Microsoft Teams, or Google Meet. ResolveX can read
            available recordings or transcripts after a meeting, extract
            decisions, and create sales tasks. Live bot attendance depends on
            the meeting provider and is not implied.
          </p>
          <button
            onClick={() => onNavigate?.("integrations")}
            className="mt-4 flex h-10 w-full items-center justify-between rounded-[6px] bg-[#15171b] px-3 text-xs font-semibold text-white"
          >
            Connect meeting apps <ArrowRight size={13} />
          </button>
        </div>
        <div className="rounded-[10px] border border-[#c8e99c] bg-[#f3ffe4] p-5">
          <Bot size={18} />
          <h3 className="mt-4 font-semibold">What AI can do here</h3>
          <p className="mt-2 text-xs leading-5 text-[#58713e]">
            Label intent, score CRM signals, summarize verified transcripts,
            draft next actions, and place consequential tool calls behind
            approval.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Tasks({
  data,
  onReload,
}: {
  data: CrmData;
  onReload: () => Promise<void>;
}) {
  async function complete(id: string, status: string) {
    const response = await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "task", id, status }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onReload();
  }
  return (
    <section className="mt-6 space-y-3">
      {data.tasks.map((task) => (
        <article
          key={task.id}
          className="flex flex-wrap items-center gap-3 rounded-[9px] border border-black/10 bg-white p-4"
        >
          <button
            aria-label={
              task.status === "completed" ? "Reopen task" : "Complete task"
            }
            onClick={() =>
              void complete(
                task.id,
                task.status === "completed" ? "open" : "completed",
              )
            }
            className={cn(
              "grid size-9 place-items-center rounded-full",
              task.status === "completed"
                ? "bg-[#d8ff70] text-[#315d0b]"
                : "bg-[#eef0f4] text-[#7b8089]",
            )}
          >
            <CheckCircle2 size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <b
              className={cn(
                "text-sm",
                task.status === "completed" && "line-through opacity-55",
              )}
            >
              {task.title}
            </b>
            <p className="mt-1 text-[10px] capitalize text-[#7b8089]">
              {task.priority} · {task.status.replaceAll("_", " ")} ·{" "}
              {task.source}
            </p>
          </div>
          {task.due_at && (
            <span className="text-xs text-[#777c85]">
              Due {new Date(task.due_at).toLocaleDateString()}
            </span>
          )}
        </article>
      ))}
      {!data.tasks.length && (
        <Empty
          title="No open work"
          copy="Create a task manually or let conversations, calls, meetings, AI employees, and Flows create follow-up work."
        />
      )}
    </section>
  );
}

function CreatePanel({
  mode,
  contacts,
  onClose,
  onSaved,
  saving,
  setSaving,
}: {
  mode: SalesView;
  contacts: CrmData["contacts"];
  onClose: () => void;
  onSaved: () => Promise<void>;
  saving: boolean;
  setSaving: (value: boolean) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const common = Object.fromEntries(form.entries());
    let body: Record<string, unknown>;
    if (mode === "contacts")
      body = {
        type: "contact",
        name: common.name,
        email: common.email,
        lifecycleStage: common.lifecycleStage,
        territory: common.territory,
        leadScore: Number(common.leadScore || 0),
        customFields: {},
      };
    else if (mode === "pipeline")
      body = {
        type: "deal",
        title: common.title,
        stage: common.stage,
        amountMinor: Math.round(Number(common.amount || 0) * 100),
        currency: common.currency,
        probability: Number(common.probability || 10),
        nextStep: common.nextStep,
        territory: common.territory,
      };
    else if (mode === "sequences")
      body = {
        type: "sequence",
        name: common.name,
        audienceStage: common.audienceStage,
        templateSubject: common.templateSubject,
        templateBody: common.templateBody,
      };
    else if (mode === "activities")
      body = {
        type: "activity",
        title: common.title,
        activityType: common.activityType,
        contactId: common.contactId || undefined,
        summary: common.summary,
      };
    else
      body = {
        type: "task",
        title: common.title,
        priority: common.priority,
        dueAt: common.dueAt
          ? new Date(String(common.dueAt)).toISOString()
          : undefined,
      };
    const response = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.error);
    toast.success("Saved to the workspace");
    onClose();
    await onSaved();
  }
  return (
    <form
      onSubmit={submit}
      className="mt-5 grid gap-3 rounded-[10px] border border-black/10 bg-white p-5 md:grid-cols-2"
    >
      {(mode === "contacts" || mode === "sequences") && (
        <input
          required
          name="name"
          placeholder={mode === "contacts" ? "Full name" : "Sequence name"}
          className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
        />
      )}
      {mode === "contacts" && (
        <>
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <select
            name="lifecycleStage"
            defaultValue="lead"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            {lifecycle.map((item) => (
              <option key={item} value={item}>
                {pretty(item)}
              </option>
            ))}
          </select>
          <input
            name="territory"
            placeholder="Territory or owner group"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <input
            name="leadScore"
            type="number"
            min="0"
            max="100"
            defaultValue="0"
            placeholder="Lead score"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
        </>
      )}
      {mode === "pipeline" && (
        <>
          <input
            required
            name="title"
            placeholder="Deal name"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <select
            name="stage"
            defaultValue="New"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            {stages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            min="0"
            placeholder="Amount"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <select
            name="currency"
            defaultValue="USD"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            <option>USD</option>
            <option>INR</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
          <input
            name="probability"
            type="number"
            min="0"
            max="100"
            defaultValue="10"
            placeholder="Probability"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <input
            name="territory"
            placeholder="Territory"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <input
            name="nextStep"
            placeholder="Next step"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs md:col-span-2"
          />
        </>
      )}
      {mode === "sequences" && (
        <>
          <select
            name="audienceStage"
            defaultValue="lead"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            {lifecycle.map((item) => (
              <option key={item} value={item}>
                {pretty(item)}
              </option>
            ))}
          </select>
          <input
            name="templateSubject"
            placeholder="Email subject"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs md:col-span-2"
          />
          <textarea
            name="templateBody"
            rows={5}
            placeholder="Reusable email template"
            className="rounded-[6px] border border-black/10 p-3 text-xs md:col-span-2"
          />
        </>
      )}
      {mode === "activities" && (
        <>
          <input
            required
            name="title"
            placeholder="Activity title"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <select
            name="activityType"
            defaultValue="note"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            {["note", "email", "call", "meeting", "message"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            name="contactId"
            defaultValue=""
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            <option value="">No contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          <textarea
            name="summary"
            rows={3}
            placeholder="What happened?"
            className="rounded-[6px] border border-black/10 p-3 text-xs md:col-span-2"
          />
        </>
      )}
      {mode === "tasks" && (
        <>
          <input
            required
            name="title"
            placeholder="Task title"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
          <select
            name="priority"
            defaultValue="normal"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          >
            <option>low</option>
            <option>normal</option>
            <option>high</option>
            <option>urgent</option>
          </select>
          <input
            name="dueAt"
            type="datetime-local"
            className="h-11 rounded-[6px] border border-black/10 px-3 text-xs"
          />
        </>
      )}
      <div className="flex justify-end gap-2 md:col-span-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[6px] border border-black/10 px-4 text-xs"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="h-10 rounded-[6px] bg-[#355cff] px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="p-10 text-center">
      <BriefcaseBusiness size={20} className="mx-auto text-[#858a92]" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[#747982]">
        {copy}
      </p>
    </div>
  );
}
