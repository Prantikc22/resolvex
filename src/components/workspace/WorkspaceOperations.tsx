"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  Loader2,
  Plus,
  Send,
  Trash2,
  Webhook,
  Workflow,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Overview = {
  knowledge: { approved: number; pending: number; pages: number };
  customers: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    conversations: number;
    created_at: string;
  }>;
  metrics: {
    conversations: number;
    open: number;
    resolved: number;
    aiResolutions: number;
    agentReplies: number;
    firstResponseMinutes: number | null;
  };
  automations: { total: number; enabled: number };
  integrations: { total: number; connected: number };
};

function useOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/overview", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not load workspace data.");
      setData(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load workspace data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return { data, loading, reload: load };
}

function Loading() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-[#f5f6f8]">
      <Loader2 className="animate-spin text-[#355cff]" />
    </div>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[9px] border border-dashed border-black/15 bg-white/60 p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#7a7d84]">
        {copy}
      </p>
    </div>
  );
}

export function ArloLiveView({
  onOpenKnowledge,
}: {
  onOpenKnowledge: () => void;
}) {
  const { data, loading } = useOverview();
  if (loading || !data) return <Loading />;
  const ready = data.knowledge.approved > 0;
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#eef2ea] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[12px] bg-[#111318] p-6 text-white md:p-9">
          <span className="grid size-12 place-items-center rounded-[8px] bg-[#d8ff70] text-[#273b00]">
            <Bot size={21} />
          </span>
          <h2 className="mt-10 text-3xl font-semibold tracking-[-.04em]">
            {ready
              ? "Arlo is grounded and available."
              : "Arlo needs approved knowledge."}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/48">
            {ready
              ? `Arlo can cite ${data.knowledge.pages} imported pages across ${data.knowledge.approved} approved sources. Every AI resolution is recorded against billing usage.`
              : "Import a website or PDF, review it, and approve it before Arlo answers factual customer questions."}
          </p>
          <button
            onClick={onOpenKnowledge}
            className="mt-7 flex h-11 items-center gap-2 rounded-[6px] bg-white px-4 text-xs font-semibold text-[#17191d]"
          >
            {ready ? "Manage knowledge" : "Add knowledge"}
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Approved sources", data.knowledge.approved],
            ["Awaiting approval", data.knowledge.pending],
            ["AI resolutions · 30d", data.metrics.aiResolutions],
            ["Open conversations", data.metrics.open],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-[9px] border border-black/8 bg-white p-5"
            >
              <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8b8e95]">
                {label}
              </div>
              <div className="mt-7 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomersLiveView({ onInstall }: { onInstall: () => void }) {
  const { data, loading } = useOverview();
  if (loading || !data) return <Loading />;
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Customers
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              Profiles created from real messenger conversations.
            </p>
          </div>
          <button
            onClick={onInstall}
            className="flex h-11 items-center gap-2 rounded-[6px] bg-[#17191d] px-4 text-xs font-semibold text-white"
          >
            Install messenger <ArrowRight size={14} />
          </button>
        </div>
        <div className="mt-7 overflow-hidden rounded-[9px] border border-black/10 bg-white">
          <div className="grid grid-cols-[1fr_140px_100px] border-b border-black/8 bg-[#fafafa] px-4 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#8a8d94]">
            <span>Customer</span>
            <span>Company</span>
            <span>Threads</span>
          </div>
          {data.customers.map((customer) => (
            <div
              key={customer.id}
              className="grid grid-cols-[1fr_140px_100px] items-center border-b border-black/7 px-4 py-4"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {customer.name}
                </div>
                <div className="mt-1 truncate text-[10px] text-[#8a8d94]">
                  {customer.email ?? "Anonymous website visitor"}
                </div>
              </div>
              <span className="truncate text-xs text-[#737780]">
                {customer.company ?? "—"}
              </span>
              <span className="text-xs font-semibold">
                {customer.conversations}
              </span>
            </div>
          ))}
          {!data.customers.length && (
            <div className="p-6">
              <Empty
                title="No customers yet"
                copy="Install the messenger and send a real message. The visitor profile and conversation will appear here immediately."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportsLiveView() {
  const { data, loading } = useOverview();
  if (loading || !data) return <Loading />;
  const resolutionRate = data.metrics.conversations
    ? Math.round((data.metrics.resolved / data.metrics.conversations) * 100)
    : null;
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#eaf1ff] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-.04em]">Reports</h2>
          <p className="mt-2 text-sm text-[#65738a]">
            A live 30-day view calculated from this workspace’s support events.
          </p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "Conversations",
              data.metrics.conversations,
              "All recorded threads",
            ],
            [
              "Resolution rate",
              resolutionRate == null ? "—" : `${resolutionRate}%`,
              "Resolved ÷ total",
            ],
            [
              "First response",
              data.metrics.firstResponseMinutes == null
                ? "—"
                : `${data.metrics.firstResponseMinutes}m`,
              "Average first AI or human reply",
            ],
            [
              "AI resolutions",
              data.metrics.aiResolutions,
              "Billable usage ledger",
            ],
            [
              "Human replies",
              data.metrics.agentReplies,
              "Messages sent by agents",
            ],
            ["Open now", data.metrics.open, "Needs attention"],
          ].map(([label, value, copy]) => (
            <div
              key={String(label)}
              className="rounded-[9px] border border-[#5072a2]/12 bg-white/85 p-5"
            >
              <Activity size={16} className="text-[#355cff]" />
              <div className="mt-8 text-[10px] font-bold uppercase tracking-[.1em] text-[#7c8798]">
                {label}
              </div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
              <p className="mt-2 text-[10px] text-[#8a94a4]">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_config: { contains?: string };
  actions: Array<{ type: string; value?: string }>;
  run_count: number;
};

export function AutomationsLiveView() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contains: "",
    priority: "high",
    tag: "",
    handoff: false,
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/automations", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setItems(data.automations ?? []);
    else toast.error(data.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setItems((value) => [data.automation, ...value]);
    setCreating(false);
    setForm({
      name: "",
      contains: "",
      priority: "high",
      tag: "",
      handoff: false,
    });
    toast.success("Automation is live.");
  }
  async function toggle(item: Automation) {
    const response = await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setItems((value) =>
      value.map((entry) => (entry.id === item.id ? data.automation : entry)),
    );
  }
  async function remove(id: string) {
    const response = await fetch("/api/automations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setItems((value) => value.filter((entry) => entry.id !== id));
  }
  if (loading) return <Loading />;
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Automations
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              Rules execute on every new messenger message.
            </p>
          </div>
          <button
            onClick={() => setCreating((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-[6px] bg-[#17191d] px-4 text-xs font-semibold text-white"
          >
            <Plus size={14} />
            New rule
          </button>
        </div>
        {creating && (
          <form
            onSubmit={create}
            className="mt-6 grid gap-3 rounded-[9px] border border-black/10 bg-white p-5 md:grid-cols-2"
          >
            <input
              required
              placeholder="Rule name"
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            />
            <input
              placeholder="Message contains (optional)"
              value={form.contains}
              onChange={(event) =>
                setForm((value) => ({ ...value, contains: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            />
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((value) => ({ ...value, priority: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            >
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent priority</option>
            </select>
            <input
              placeholder="Add tag (optional)"
              value={form.tag}
              onChange={(event) =>
                setForm((value) => ({ ...value, tag: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.handoff}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    handoff: event.target.checked,
                  }))
                }
              />
              Hand off to a human
            </label>
            <button className="h-10 rounded-[5px] bg-[#355cff] text-xs font-semibold text-white">
              Activate rule
            </button>
          </form>
        )}
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-[9px] border border-black/10 bg-white p-4"
            >
              <span className="grid size-10 place-items-center rounded-[6px] bg-[#eafbd2] text-[#477d20]">
                <Workflow size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="mt-1 text-[10px] text-[#858891]">
                  {item.trigger_config.contains
                    ? `When message contains “${item.trigger_config.contains}”`
                    : "On every new message"}{" "}
                  · ran {item.run_count} times
                </div>
              </div>
              <button
                onClick={() => void toggle(item)}
                className={`h-8 rounded-full px-3 text-[10px] font-semibold ${item.enabled ? "bg-[#d8ff70] text-[#315313]" : "bg-[#eceef1] text-[#72767e]"}`}
              >
                {item.enabled ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => void remove(item.id)}
                className="grid size-8 place-items-center rounded-[5px] border border-black/10 text-[#8a8d94]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!items.length && (
            <Empty
              title="No automations yet"
              copy="Create a rule to set priority, add a tag, or hand conversations to a person when a message matches."
            />
          )}
        </div>
      </div>
    </div>
  );
}

type Integration = {
  id: string;
  status: string;
  config: { name?: string; url?: string; events?: string[] };
};

export function IntegrationsLiveView() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    events: ["message.created"],
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setItems(data.integrations ?? []);
    else toast.error(data.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function connect(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", ...form }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setItems((value) => [data.integration, ...value]);
    setOpen(false);
    setForm({ name: "", url: "", events: ["message.created"] });
    toast.success("Webhook connected.");
  }
  async function test(id: string) {
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", id }),
    });
    const data = await response.json();
    if (response.ok) toast.success("Test event delivered.");
    else toast.error(data.error);
  }
  async function remove(id: string) {
    const response = await fetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setItems((value) => value.filter((entry) => entry.id !== id));
  }
  if (loading) return <Loading />;
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Integrations
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              Production webhooks that deliver real support events to your
              systems.
            </p>
          </div>
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-[6px] bg-[#17191d] px-4 text-xs font-semibold text-white"
          >
            <Plus size={14} />
            Connect webhook
          </button>
        </div>
        {open && (
          <form
            onSubmit={connect}
            className="mt-6 grid gap-3 rounded-[9px] border border-black/10 bg-white p-5 md:grid-cols-2"
          >
            <input
              required
              placeholder="Integration name"
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            />
            <input
              required
              type="url"
              placeholder="https://yourapp.com/webhooks/resolvex"
              value={form.url}
              onChange={(event) =>
                setForm((value) => ({ ...value, url: event.target.value }))
              }
              className="h-10 rounded-[5px] border border-black/10 px-3 text-xs"
            />
            <div className="flex flex-wrap gap-3 md:col-span-2">
              {[
                "message.created",
                "conversation.replied",
                "conversation.resolved",
              ].map((eventName) => (
                <label
                  key={eventName}
                  className="flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={form.events.includes(eventName)}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        events: event.target.checked
                          ? [...value.events, eventName]
                          : value.events.filter((item) => item !== eventName),
                      }))
                    }
                  />
                  {eventName}
                </label>
              ))}
            </div>
            <button className="h-10 rounded-[5px] bg-[#355cff] text-xs font-semibold text-white md:col-span-2">
              Connect production webhook
            </button>
          </form>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[9px] border border-black/10 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-[6px] bg-[#dbe6ff] text-[#355cff]">
                  <Webhook size={17} />
                </span>
                <span className="flex items-center gap-1 rounded-full bg-[#eafbd2] px-2.5 py-1 text-[9px] font-semibold text-[#427a1d]">
                  <Check size={10} />
                  Connected
                </span>
              </div>
              <h3 className="mt-7 text-lg font-semibold">
                {item.config.name ?? "Webhook"}
              </h3>
              <p className="mt-2 truncate text-[10px] text-[#81858d]">
                {item.config.url}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => void test(item.id)}
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[5px] bg-[#17191d] text-[10px] font-semibold text-white"
                >
                  <Send size={12} />
                  Send test
                </button>
                <button
                  onClick={() => void remove(item.id)}
                  className="grid size-9 place-items-center rounded-[5px] border border-black/10 text-[#8a8d94]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="md:col-span-2">
              <Empty
                title="No integrations connected"
                copy="Connect an HTTPS webhook. ResolveX will deliver new messages, human replies, and resolved-conversation events."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
