"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Link2,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Loading() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-[#f4f5f2]">
      <Loader2 className="animate-spin text-[#355cff]" />
    </div>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-black/15 bg-white/65 p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[#747982]">
        {copy}
      </p>
    </div>
  );
}

function ModuleShell({
  eyebrow,
  title,
  copy,
  action,
  children,
  tone = "#f4f5f2",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <div
      className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 text-[#15171b] md:p-7"
      style={{ backgroundColor: tone }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6f747d]">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#717680]">
              {copy}
            </p>
          </div>
          {action}
        </div>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

type Employee = {
  id: string;
  name: string;
  template_type:
    "support" | "receptionist" | "sales" | "customer_success" | "custom";
  description: string;
  instructions: string;
  status: string;
  voice_id: string | null;
  languages: string[];
  knowledge_source_ids: string[];
  connected_toolkits: string[];
  assigned_channels: string[];
  usage_budget_cents: number;
  provider: string | null;
  external_agent_id: string | null;
  last_error: string | null;
};

type EmployeeTemplate = {
  label: string;
  description: string;
  instructions: string;
  greeting: string;
  channels: string[];
  recommendedToolkits: string[];
};

const templateOrder: Employee["template_type"][] = [
  "support",
  "receptionist",
  "sales",
  "customer_success",
  "custom",
];

function statusTone(status: string) {
  if (status === "active") return "bg-[#e9fbd0] text-[#397313]";
  if (status === "failed") return "bg-[#ffede8] text-[#a33a27]";
  if (status === "provisioning") return "bg-[#fff3d7] text-[#8b5d00]";
  return "bg-[#eceef2] text-[#646a74]";
}

export function AIEmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Record<string, EmployeeTemplate>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<Employee["template_type"]>("support");
  const [name, setName] = useState("Arlo Support");
  const [instructions, setInstructions] = useState("");
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/ai-employees", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) toast.error(data.error);
    else {
      setEmployees(data.employees ?? []);
      setTemplates(data.templates ?? {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function chooseTemplate(id: Employee["template_type"]) {
    setSelectedTemplate(id);
    setName(templates[id]?.label ?? "Custom employee");
    setInstructions(templates[id]?.instructions ?? "");
    setVoice(templates[id]?.channels.includes("voice") ?? false);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    const response = await fetch("/api/ai-employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateType: selectedTemplate,
        instructions: instructions || templates[selectedTemplate]?.instructions,
        assignedChannels: voice ? ["chat", "voice"] : ["chat"],
        connectedToolkits:
          templates[selectedTemplate]?.recommendedToolkits ?? [],
      }),
    });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) return toast.error(data.error);
    setCreating(false);
    toast.success(`${data.employee.name} created as a draft.`);
    await load();
  }

  async function action(
    employee: Employee,
    actionName: "activate" | "pause" | "delete",
  ) {
    if (
      actionName === "delete" &&
      !window.confirm(`Delete ${employee.name}? This cannot be undone.`)
    )
      return;
    setBusy(employee.id);
    const response =
      actionName === "activate"
        ? await fetch(`/api/ai-employees/${employee.id}/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmation: "ACTIVATE" }),
          })
        : await fetch("/api/ai-employees", {
            method: actionName === "delete" ? "DELETE" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              actionName === "delete"
                ? {
                    id: employee.id,
                    confirmation: "DELETE",
                    deleteProviderResource: true,
                  }
                : { id: employee.id, action: "pause" },
            ),
          });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) return toast.error(data.error);
    toast.success(
      actionName === "activate"
        ? `${employee.name} is active.`
        : actionName === "pause"
          ? `${employee.name} paused.`
          : `${employee.name} deleted.`,
    );
    await load();
  }

  if (loading) return <Loading />;
  return (
    <ModuleShell
      eyebrow="AI workforce"
      title="AI Employees"
      copy="One secure agent engine, specialized into clear roles. Every employee shares approved knowledge, workspace permissions, human escalation, and spend controls."
      tone="#eef2ea"
      action={
        <button
          onClick={() => {
            chooseTemplate("support");
            setCreating(true);
          }}
          className="flex h-11 items-center gap-2 rounded-[6px] bg-[#15171b] px-4 text-xs font-semibold text-white"
        >
          <Plus size={14} /> Create AI Employee
        </button>
      }
    >
      {creating && (
        <form
          onSubmit={create}
          className="mb-6 rounded-[12px] border border-black/10 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#757a83]">
                Step 1 of 7 · Choose a role
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                Build the job, not the prompt.
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="grid size-9 place-items-center rounded-full border border-black/10"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-5">
            {templateOrder.map((id) => (
              <button
                type="button"
                key={id}
                onClick={() => chooseTemplate(id)}
                className={cn(
                  "rounded-[8px] border p-3 text-left text-xs transition",
                  selectedTemplate === id
                    ? "border-[#355cff] bg-[#edf1ff]"
                    : "border-black/10 hover:border-black/25",
                )}
              >
                <Bot size={15} />
                <b className="mt-4 block">{templates[id]?.label ?? id}</b>
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold">
              Name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-[6px] border border-black/10 px-3 font-normal outline-none focus:border-[#355cff]"
              />
            </label>
            <label className="flex items-center justify-between rounded-[7px] border border-black/10 p-4 text-xs">
              <span>
                <b className="block">Website voice</b>
                <span className="mt-1 block text-[10px] text-[#7c818a]">
                  Provision ElevenLabs only when activated.
                </span>
              </span>
              <input
                type="checkbox"
                checked={voice}
                onChange={(event) => setVoice(event.target.checked)}
                className="size-4 accent-[#355cff]"
              />
            </label>
          </div>
          <label className="mt-4 block text-xs font-semibold">
            Role instructions
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-[6px] border border-black/10 p-3 font-normal leading-5 outline-none focus:border-[#355cff]"
            />
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5">
            <p className="text-[10px] text-[#777c85]">
              Knowledge, apps, channels, testing, and activation stay editable
              after creation.
            </p>
            <button
              disabled={busy === "create"}
              className="flex h-10 items-center gap-2 rounded-[6px] bg-[#355cff] px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "create" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRight size={14} />
              )}
              Create draft
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {employees.map((employee) => (
          <article
            key={employee.id}
            className="rounded-[11px] border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#15171b] text-[#d8ff70]">
                <Bot size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{employee.name}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[9px] font-bold capitalize",
                      statusTone(employee.status),
                    )}
                  >
                    {employee.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#777c85]">
                  {employee.description}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-[6px] bg-[#f5f6f7] p-3">
                <span className="block text-[#858a92]">Channels</span>
                <b className="mt-1 block capitalize">
                  {employee.assigned_channels.join(", ")}
                </b>
              </div>
              <div className="rounded-[6px] bg-[#f5f6f7] p-3">
                <span className="block text-[#858a92]">Apps</span>
                <b className="mt-1 block">
                  {employee.connected_toolkits.length}
                </b>
              </div>
              <div className="rounded-[6px] bg-[#f5f6f7] p-3">
                <span className="block text-[#858a92]">Budget</span>
                <b className="mt-1 block">
                  ${(employee.usage_budget_cents / 100).toFixed(0)}/mo
                </b>
              </div>
            </div>
            {employee.last_error && (
              <p className="mt-3 rounded-[6px] bg-[#fff0ec] p-3 text-[10px] text-[#9b3b27]">
                {employee.last_error}
              </p>
            )}
            {employee.external_agent_id && employee.status === "active" && (
              <div className="mt-4">
                <VoiceTester employee={employee} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-black/8 pt-4">
              {employee.status !== "active" ? (
                <button
                  disabled={busy === employee.id}
                  onClick={() => void action(employee, "activate")}
                  className="flex h-9 items-center gap-2 rounded-[5px] bg-[#15171b] px-3 text-[10px] font-semibold text-white disabled:opacity-50"
                >
                  <Play size={12} /> Activate
                </button>
              ) : (
                <button
                  disabled={busy === employee.id}
                  onClick={() => void action(employee, "pause")}
                  className="flex h-9 items-center gap-2 rounded-[5px] border border-black/10 px-3 text-[10px] font-semibold"
                >
                  <Pause size={12} /> Pause
                </button>
              )}
              <button
                disabled={busy === employee.id}
                onClick={() => void action(employee, "delete")}
                className="ml-auto grid size-9 place-items-center rounded-[5px] border border-black/10 text-[#8a4c42]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!employees.length && !creating && (
        <Empty
          title="Create your first AI employee"
          copy="Choose a role, connect approved knowledge, test it in chat or voice, and activate only when you are satisfied."
        />
      )}
    </ModuleShell>
  );
}

function voiceMessageText(value: unknown) {
  if (!value || typeof value !== "object") return "Voice event";
  const item = value as Record<string, unknown>;
  return String(item.message ?? item.source ?? item.type ?? "Voice event");
}

function VoiceTester({ employee }: { employee: Employee }) {
  const [transcript, setTranscript] = useState<string[]>([]);
  return (
    <ConversationProvider
      onMessage={(message) =>
        setTranscript((items) => [
          ...items.slice(-4),
          voiceMessageText(message),
        ])
      }
      onError={(error) => toast.error(String(error))}
    >
      <VoiceControls employee={employee} transcript={transcript} />
    </ConversationProvider>
  );
}

function VoiceControls({
  employee,
  transcript,
}: {
  employee: Employee;
  transcript: string[];
}) {
  const conversation = useConversation();
  const [starting, setStarting] = useState(false);
  async function start() {
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch(
        `/api/ai-employees/${employee.id}/voice-session`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await conversation.startSession({ signedUrl: data.signedUrl });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start voice test.",
      );
    } finally {
      setStarting(false);
    }
  }
  const connected = conversation.status === "connected";
  return (
    <div className="rounded-[8px] bg-[#101319] p-4 text-white">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-full",
            connected
              ? "bg-[#d8ff70] text-[#1b2c00]"
              : "bg-white/10 text-white/55",
          )}
        >
          <Mic size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-xs">Website voice test</b>
          <span className="text-[9px] capitalize text-white/40">
            {conversation.status}
            {conversation.isSpeaking ? " · Arlo speaking" : ""}
          </span>
        </div>
        {!connected ? (
          <button
            disabled={starting}
            onClick={() => void start()}
            className="h-8 rounded-[5px] bg-white px-3 text-[10px] font-semibold text-[#15171b]"
          >
            {starting ? "Connecting…" : "Start"}
          </button>
        ) : (
          <>
            <button
              onClick={() => conversation.setMuted(!conversation.isMuted)}
              className="grid size-8 place-items-center rounded-[5px] border border-white/15"
            >
              {conversation.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
            <button
              onClick={() => void conversation.endSession()}
              className="h-8 rounded-[5px] bg-[#ff6e59] px-3 text-[10px] font-semibold"
            >
              End
            </button>
          </>
        )}
      </div>
      {transcript.length > 0 && (
        <div className="mt-3 max-h-20 overflow-auto border-t border-white/10 pt-2 text-[9px] leading-4 text-white/45">
          {transcript.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

type CrmData = {
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
  }>;
  companies: Array<{
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage: string;
    amount_minor: number;
    currency: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
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
  }>;
};

function useCrm() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const response = await fetch("/api/crm", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) toast.error(result.error);
    else setData(result);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return { data, loading, load };
}

export function CRMView({
  mode = "crm",
}: {
  mode?: "crm" | "contacts" | "tasks";
}) {
  const { data, loading, load } = useCrm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  if (loading || !data) return <Loading />;
  async function create(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: mode === "tasks" ? "task" : "contact",
        ...(mode === "tasks" ? { title: name } : { name, email }),
      }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    setName("");
    setEmail("");
    setOpen(false);
    await load();
  }
  const title =
    mode === "contacts"
      ? "Contacts"
      : mode === "tasks"
        ? "Tasks"
        : "Customer relationships";
  return (
    <ModuleShell
      eyebrow={mode === "crm" ? "ResolveX CRM" : "Operations"}
      title={title}
      copy={
        mode === "crm"
          ? "Contacts, companies, deals, appointments, tasks, and conversations share one verified customer timeline."
          : mode === "contacts"
            ? "Customer identities stay connected across chat, email, phone, and business systems without unsafe automatic merges."
            : "Follow-up work created by people, conversations, calls, and flows."
      }
      tone="#f5f1e8"
      action={
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 items-center gap-2 rounded-[6px] bg-[#15171b] px-4 text-xs font-semibold text-white"
        >
          <Plus size={14} /> {mode === "tasks" ? "New task" : "New contact"}
        </button>
      }
    >
      {open && (
        <form
          onSubmit={create}
          className="mb-5 flex flex-wrap gap-3 rounded-[9px] border border-black/10 bg-white p-4"
        >
          <input
            required
            placeholder={mode === "tasks" ? "Task title" : "Full name"}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-56 flex-1 rounded-[5px] border border-black/10 px-3 text-xs"
          />
          {mode !== "tasks" && (
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 min-w-56 flex-1 rounded-[5px] border border-black/10 px-3 text-xs"
            />
          )}
          <button className="h-10 rounded-[5px] bg-[#355cff] px-4 text-xs font-semibold text-white">
            Save
          </button>
        </form>
      )}
      {mode === "contacts" && (
        <div className="overflow-hidden rounded-[9px] border border-black/10 bg-white">
          {data.contacts.map((contact) => (
            <div
              key={contact.id}
              className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-black/7 p-4"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#d8ff70] text-[10px] font-bold">
                {contact.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <b className="text-xs">{contact.name}</b>
                <p className="mt-1 text-[10px] text-[#7b8089]">
                  {contact.email ?? contact.phone ?? "No verified identifier"}
                </p>
              </div>
              <span className="text-[9px] text-[#8a8e96]">
                {contact.tags?.join(", ") || "No tags"}
              </span>
            </div>
          ))}
          {!data.contacts.length && (
            <div className="p-5">
              <Empty
                title="No contacts yet"
                copy="Add a contact or let the website messenger create one from a real conversation."
              />
            </div>
          )}
        </div>
      )}
      {mode === "tasks" && (
        <div className="space-y-3">
          {data.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-[8px] border border-black/10 bg-white p-4"
            >
              <CheckCircle2
                size={17}
                className={
                  task.status === "completed"
                    ? "text-[#559127]"
                    : "text-[#a0a4ab]"
                }
              />
              <div className="flex-1">
                <b className="text-xs">{task.title}</b>
                <p className="mt-1 text-[9px] capitalize text-[#81858d]">
                  {task.priority} · {task.status.replace("_", " ")}
                </p>
              </div>
              {task.due_at && (
                <span className="text-[9px] text-[#777c85]">
                  {new Date(task.due_at).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
          {!data.tasks.length && (
            <Empty
              title="No open work"
              copy="Tasks created by your team, calls, and flows will appear here."
            />
          )}
        </div>
      )}
      {mode === "crm" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-[10px] border border-black/10 bg-white p-5">
            <UserRound size={17} />
            <h3 className="mt-5 text-sm font-semibold">Contacts</h3>
            <p className="mt-1 text-3xl font-semibold">
              {data.contacts.length}
            </p>
            <div className="mt-5 space-y-2">
              {data.contacts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="border-t border-black/7 pt-2 text-xs"
                >
                  <b>{item.name}</b>
                  <span className="ml-2 text-[9px] text-[#8b8f96]">
                    {item.email}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[10px] border border-black/10 bg-white p-5">
            <CircleDollarSign size={17} />
            <h3 className="mt-5 text-sm font-semibold">Deal pipeline</h3>
            <p className="mt-1 text-3xl font-semibold">{data.deals.length}</p>
            <div className="mt-5 space-y-2">
              {data.deals.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-t border-black/7 pt-2 text-xs"
                >
                  <b>{item.title}</b>
                  <span className="text-[9px] text-[#8b8f96]">
                    {item.stage}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[10px] border border-black/10 bg-[#15171b] p-5 text-white">
            <Activity size={17} className="text-[#d8ff70]" />
            <h3 className="mt-5 text-sm font-semibold">Customer timeline</h3>
            <p className="mt-1 text-3xl font-semibold">
              {data.activities.length}
            </p>
            <div className="mt-5 space-y-2">
              {data.activities.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="border-t border-white/10 pt-2 text-xs"
                >
                  <b>{item.title}</b>
                  <p className="mt-1 text-[9px] text-white/35">
                    {new Date(item.occurred_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </ModuleShell>
  );
}

type Approval = {
  id: string;
  title: string;
  risk: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export function ApprovalsView() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const response = await fetch("/api/approvals", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setItems(data.approvals ?? []);
    else toast.error(data.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function decide(id: string, decision: "approved" | "rejected") {
    const response = await fetch("/api/approvals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success(`Request ${decision}.`);
    await load();
  }
  if (loading) return <Loading />;
  return (
    <ModuleShell
      eyebrow="AI workforce"
      title="Approvals"
      copy="ResolveX enforces consequential-action approvals in the execution layer. Prompts alone never grant authority."
      tone="#fff6e6"
    >
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-4 rounded-[9px] border border-black/10 bg-white p-4"
          >
            <span className="grid size-10 place-items-center rounded-[7px] bg-[#fff0d2] text-[#8d5b00]">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b className="text-sm">{item.title}</b>
                <span className="rounded-full bg-[#f2f3f5] px-2 py-1 text-[9px] font-bold capitalize">
                  {item.risk} risk
                </span>
              </div>
              <p className="mt-1 truncate text-[10px] text-[#7f838b]">
                {String(
                  item.payload?.tool_slug ??
                    item.payload?.note ??
                    "Workspace action",
                )}
              </p>
            </div>
            <span className="text-[10px] capitalize text-[#747982]">
              {item.status}
            </span>
            {item.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => void decide(item.id, "rejected")}
                  className="h-8 rounded-[5px] border border-black/10 px-3 text-[10px] font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={() => void decide(item.id, "approved")}
                  className="h-8 rounded-[5px] bg-[#15171b] px-3 text-[10px] font-semibold text-white"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        ))}
        {!items.length && (
          <Empty
            title="No approvals waiting"
            copy="Refunds, external messages, record changes, purchases, and other consequential actions will stop here for review."
          />
        )}
      </div>
    </ModuleShell>
  );
}

type CallRow = {
  id: string;
  direction: string;
  handler_type: string;
  from_number: string | null;
  to_number: string | null;
  status: string;
  duration_seconds: number;
  summary: string | null;
  outcome: string | null;
  created_at: string;
};

export function CallsView() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/calls", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (response.ok) setCalls(data.calls ?? []);
        else toast.error(data.error);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  return (
    <ModuleShell
      eyebrow="ResolveX Voice"
      title="Calls"
      copy="Inbound, outbound, AI, human, missed, and transferred calls share one customer history. No call is simulated in a live workspace."
      tone="#edf3ff"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Calls", calls.length, PhoneCall],
          [
            "Answered",
            calls.filter((item) => item.status === "completed").length,
            Check,
          ],
          [
            "Missed",
            calls.filter((item) => item.status === "missed").length,
            Clock3,
          ],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Phone;
          return (
            <div
              key={String(label)}
              className="rounded-[9px] border border-[#5876a8]/12 bg-white p-5"
            >
              <I size={17} className="text-[#355cff]" />
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[.1em] text-[#7e8795]">
                {label as string}
              </p>
              <p className="mt-1 text-3xl font-semibold">{value as number}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 overflow-hidden rounded-[9px] border border-black/10 bg-white">
        {calls.map((call) => (
          <div
            key={call.id}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-black/7 p-4"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#edf1ff] text-[#355cff]">
              <Phone size={15} />
            </span>
            <div>
              <b className="text-xs capitalize">
                {call.direction} · {call.handler_type}
              </b>
              <p className="mt-1 text-[10px] text-[#858a93]">
                {call.from_number ?? "Unknown"} → {call.to_number ?? "Unknown"}
              </p>
            </div>
            <div className="text-right">
              <b className="text-[10px] capitalize">
                {call.status.replace("_", " ")}
              </b>
              <p className="mt-1 text-[9px] text-[#858a93]">
                {call.duration_seconds}s
              </p>
            </div>
          </div>
        ))}
        {!calls.length && (
          <div className="p-5">
            <Empty
              title="No calls yet"
              copy="Activate a voice employee, request a verified number, and complete a real test call. The call record, transcript, and outcome will appear here."
            />
          </div>
        )}
      </div>
    </ModuleShell>
  );
}

type IntegrationData = {
  configured: boolean;
  catalog: Array<{ slug: string; name: string; category: string }>;
  connections: Array<{ id: string; toolkit: string; status: string }>;
  pending: Array<{ provider: string; status: string }>;
};

export function ConnectView() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/integrations/composio", {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok && !result.catalog) toast.error(result.error);
    setData(result);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function connect(toolkit: string) {
    setBusy(toolkit);
    const response = await fetch("/api/integrations/composio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkit }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return toast.error(result.error);
    window.location.assign(result.redirectUrl);
  }
  async function disconnect(toolkit: string, accountId: string) {
    if (
      !window.confirm(`Disconnect ${toolkit}? Its tools will stop immediately.`)
    )
      return;
    setBusy(toolkit);
    const response = await fetch("/api/integrations/composio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkit, accountId, confirmation: "DISCONNECT" }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return toast.error(result.error);
    await load();
  }
  if (loading || !data) return <Loading />;
  const connections = new Map(
    data.connections.map((item) => [item.toolkit, item]),
  );
  return (
    <ModuleShell
      eyebrow="ResolveX Connect"
      title="Integrations"
      copy="Customers connect their own business accounts through ResolveX. Provider credentials stay server-side and every tool call is tenant-scoped, permission-checked, and logged."
      tone="#f1f0f8"
      action={
        <button
          onClick={() => void load()}
          className="grid size-11 place-items-center rounded-[6px] border border-black/10 bg-white"
        >
          <RefreshCw size={15} />
        </button>
      }
    >
      <div className="mb-5 flex gap-3 rounded-[8px] border border-black/8 bg-white p-4 text-xs">
        <ShieldCheck size={17} className="shrink-0 text-[#497d27]" />
        <p>
          <b>
            {data.configured
              ? "Managed authentication is ready."
              : "Composio is not configured."}
          </b>
          <span className="mt-1 block text-[10px] text-[#777c85]">
            A connected badge appears only after the provider confirms an active
            account.
          </span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.catalog.map((item) => {
          const connection = connections.get(item.slug);
          const pending = data.pending.some(
            (stored) =>
              stored.provider === `composio:${item.slug}` &&
              stored.status === "pending",
          );
          return (
            <article
              key={item.slug}
              className="flex min-h-44 flex-col rounded-[9px] border border-black/10 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-[6px] bg-[#f1f0f8]">
                  <Link2 size={15} />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[9px] font-bold",
                    connection?.status === "active"
                      ? "bg-[#e9fbd0] text-[#397313]"
                      : "bg-[#eff0f2] text-[#737780]",
                  )}
                >
                  {connection?.status === "active"
                    ? "Connected"
                    : pending
                      ? "Pending"
                      : "Available"}
                </span>
              </div>
              <h3 className="mt-5 text-sm font-semibold">{item.name}</h3>
              <p className="mt-1 text-[10px] text-[#858a93]">{item.category}</p>
              <button
                disabled={!data.configured || busy === item.slug}
                onClick={() =>
                  connection
                    ? void disconnect(item.slug, connection.id)
                    : void connect(item.slug)
                }
                className="mt-auto flex items-center justify-between border-t border-black/8 pt-3 text-[10px] font-semibold disabled:text-[#aaa]"
              >
                {busy === item.slug
                  ? "Working…"
                  : connection
                    ? "Disconnect"
                    : "Connect"}
                <ArrowRight size={13} />
              </button>
            </article>
          );
        })}
      </div>
    </ModuleShell>
  );
}

type AvailableNumber = {
  number: string;
  type: string | null;
  region: string | null;
  monthlyRentalRate: string | null;
  setupRate: string | null;
  currency: string | null;
  restriction: string | null;
  restrictionText: string | null;
};
type StoredNumber = {
  id: string;
  e164: string;
  country: string;
  number_type: string | null;
  status: string;
  compliance_status: string;
  monthly_cost_minor: number | null;
  currency: string | null;
};

export function PhoneNumbersView() {
  const [numbers, setNumbers] = useState<StoredNumber[]>([]);
  const [available, setAvailable] = useState<AvailableNumber[]>([]);
  const [country, setCountry] = useState("US");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    fetch("/api/phone-numbers", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (response.ok) {
          setNumbers(data.numbers ?? []);
          setConfigured(data.configured);
        } else toast.error(data.error);
      })
      .finally(() => setLoading(false));
  }, []);
  async function search() {
    setSearching(true);
    const response = await fetch(
      `/api/phone-numbers?country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    setSearching(false);
    if (!response.ok) return toast.error(data.error);
    setAvailable(data.available ?? []);
  }
  async function requestActivation(item: AvailableNumber) {
    if (
      !window.confirm(
        `Request activation for ${item.number}? ResolveX will not purchase it until billing and compliance are verified.`,
      )
    )
      return;
    const decimal = Number(item.monthlyRentalRate ?? 0);
    const response = await fetch("/api/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: item.number,
        country,
        numberType: item.type ?? undefined,
        monthlyCostMinor: Number.isFinite(decimal)
          ? Math.round(decimal * 100)
          : undefined,
        currency: item.currency ?? undefined,
        providerMetadata: item,
        confirmation: "REQUEST ACTIVATION",
      }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setNumbers((rows) => [
      data.number,
      ...rows.filter((row) => row.id !== data.number.id),
    ]);
    toast.success(data.message);
  }
  if (loading) return <Loading />;
  return (
    <ModuleShell
      eyebrow="Business"
      title="Phone Numbers"
      copy="Search actual Plivo inventory, review provider restrictions, and request activation. Rental never happens before billing authorization and required compliance approval."
      tone="#f1f5ef"
    >
      <div className="rounded-[10px] border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#767b84]">
            Country
            <input
              value={country}
              maxLength={2}
              onChange={(event) => setCountry(event.target.value.toUpperCase())}
              className="mt-2 block h-10 w-28 rounded-[5px] border border-black/10 px-3 text-xs font-normal"
            />
          </label>
          <button
            disabled={!configured || searching || country.length !== 2}
            onClick={() => void search()}
            className="flex h-10 items-center gap-2 rounded-[5px] bg-[#15171b] px-4 text-xs font-semibold text-white disabled:opacity-40"
          >
            {searching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}{" "}
            Search live inventory
          </button>
          <p className="text-[10px] text-[#81868f]">
            {configured
              ? "Provider connected"
              : "Add Plivo credentials to search"}
          </p>
        </div>
        {country === "IN" && (
          <div className="mt-4 rounded-[7px] bg-[#fff5db] p-4 text-[10px] leading-5 text-[#7a5504]">
            <b>India compliance review required.</b> KYC, number eligibility,
            data region, SIP routing, calling consent, and inbound/outbound
            tests must be accepted before activation.
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs font-semibold">Available numbers</h3>
          <div className="space-y-2">
            {available.map((item) => (
              <div
                key={item.number}
                className="flex items-center gap-3 rounded-[8px] border border-black/10 bg-white p-4"
              >
                <Phone size={15} />
                <div className="min-w-0 flex-1">
                  <b className="text-xs">{item.number}</b>
                  <p className="mt-1 text-[9px] text-[#838891]">
                    {item.type ?? "Voice"} · {item.region ?? country}
                    {item.monthlyRentalRate
                      ? ` · ${item.currency ?? ""} ${item.monthlyRentalRate}/mo`
                      : ""}
                  </p>
                  {item.restrictionText && (
                    <p className="mt-1 truncate text-[9px] text-[#9b6532]">
                      {item.restrictionText}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => void requestActivation(item)}
                  className="h-8 rounded-[5px] border border-black/10 px-3 text-[9px] font-semibold"
                >
                  Request
                </button>
              </div>
            ))}
            {!available.length && (
              <Empty
                title="Search live inventory"
                copy="ResolveX never fabricates availability or price. Results come directly from the configured telephony provider."
              />
            )}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-xs font-semibold">Workspace numbers</h3>
          <div className="space-y-2">
            {numbers.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-[8px] border border-black/10 bg-white p-4"
              >
                <span className="grid size-9 place-items-center rounded-full bg-[#e9fbd0]">
                  <Phone size={14} />
                </span>
                <div className="flex-1">
                  <b className="text-xs">{item.e164}</b>
                  <p className="mt-1 text-[9px] capitalize text-[#838891]">
                    {item.status.replaceAll("_", " ")} · compliance{" "}
                    {item.compliance_status}
                  </p>
                </div>
              </div>
            ))}
            {!numbers.length && (
              <Empty
                title="No phone numbers"
                copy="A number can route to multiple AI employees and humans. You do not need one number per employee."
              />
            )}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}

type UsageData = {
  balanceMicrounits: number;
  monthSpendMinor: number;
  limits: {
    monthly_limit_minor: number;
    voice_call_limit_seconds: number;
    alert_at_percent: number;
    hard_stop: boolean;
  };
  transactions: Array<{
    id: string;
    category: string;
    amount_microunits: number;
    monetary_amount_minor: number | null;
    currency: string;
    created_at: string;
  }>;
};

export function UsageView() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/usage", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setData(result);
    else toast.error(result.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function save() {
    if (!data) return;
    setSaving(true);
    const response = await fetch("/api/usage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyLimitMinor: data.limits.monthly_limit_minor,
        voiceCallLimitSeconds: data.limits.voice_call_limit_seconds,
        alertAtPercent: data.limits.alert_at_percent,
        hardStop: data.limits.hard_stop,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(result.error);
    toast.success("Spending controls saved.");
    await load();
  }
  if (loading || !data) return <Loading />;
  const spent = data.monthSpendMinor / 100;
  const limit = data.limits.monthly_limit_minor / 100;
  const percent = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  return (
    <ModuleShell
      eyebrow="Business"
      title="Usage & billing"
      copy="A transaction ledger for included allowance, purchases, AI, voice, telephony, integrations, refunds, and adjustments—with a hard monthly stop."
      tone="#f7f2e8"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-[10px] bg-[#15171b] p-6 text-white">
          <p className="text-[10px] uppercase tracking-[.12em] text-white/40">
            Monthly provider spend
          </p>
          <p className="mt-3 text-4xl font-semibold">${spent.toFixed(2)}</p>
          <p className="mt-1 text-xs text-white/35">
            of ${limit.toFixed(2)} hard limit
          </p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#d8ff70]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-[10px] text-white/40">
            Credit balance: {(data.balanceMicrounits / 1_000_000).toFixed(3)}{" "}
            units
          </p>
        </section>
        <section className="rounded-[10px] border border-black/10 bg-white p-5">
          <h3 className="text-sm font-semibold">Cost controls</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-[10px] font-semibold">
              Monthly limit (USD)
              <input
                type="number"
                min="0"
                value={data.limits.monthly_limit_minor / 100}
                onChange={(event) =>
                  setData({
                    ...data,
                    limits: {
                      ...data.limits,
                      monthly_limit_minor: Math.round(
                        Number(event.target.value) * 100,
                      ),
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs"
              />
            </label>
            <label className="text-[10px] font-semibold">
              Max call seconds
              <input
                type="number"
                min="30"
                value={data.limits.voice_call_limit_seconds}
                onChange={(event) =>
                  setData({
                    ...data,
                    limits: {
                      ...data.limits,
                      voice_call_limit_seconds: Number(event.target.value),
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs"
              />
            </label>
            <label className="text-[10px] font-semibold">
              Alert at %
              <input
                type="number"
                min="1"
                max="100"
                value={data.limits.alert_at_percent}
                onChange={(event) =>
                  setData({
                    ...data,
                    limits: {
                      ...data.limits,
                      alert_at_percent: Number(event.target.value),
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs"
              />
            </label>
          </div>
          <label className="mt-4 flex items-center justify-between rounded-[6px] bg-[#f4f5f6] p-3 text-xs">
            <span>
              <b>Hard stop</b>
              <span className="mt-1 block text-[9px] text-[#7f848c]">
                Block new billable provider work at the limit.
              </span>
            </span>
            <input
              type="checkbox"
              checked={data.limits.hard_stop}
              onChange={(event) =>
                setData({
                  ...data,
                  limits: { ...data.limits, hard_stop: event.target.checked },
                })
              }
              className="size-4 accent-[#355cff]"
            />
          </label>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="mt-4 h-9 rounded-[5px] bg-[#15171b] px-4 text-[10px] font-semibold text-white"
          >
            {saving ? "Saving…" : "Save controls"}
          </button>
        </section>
      </div>
      <section className="mt-5 overflow-hidden rounded-[9px] border border-black/10 bg-white">
        <div className="border-b border-black/8 p-4 text-xs font-semibold">
          Credit ledger
        </div>
        {data.transactions.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-black/7 px-4 py-3 text-[10px]"
          >
            <span className="capitalize">{item.category}</span>
            <span>{(item.amount_microunits / 1_000_000).toFixed(3)} units</span>
            <span className="text-[#858a92]">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
        {!data.transactions.length && (
          <div className="p-5">
            <Empty
              title="No ledger entries yet"
              copy="Real usage and billing events will appear here. ResolveX does not invent cost or savings data."
            />
          </div>
        )}
      </section>
    </ModuleShell>
  );
}

export function OverviewDashboard({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(
    null,
  );
  useEffect(() => {
    fetch("/api/workspace/overview", { cache: "no-store" })
      .then((response) => response.json())
      .then(setOverview)
      .catch(() => setOverview({}));
  }, []);
  const metrics = useMemo(
    () => (overview?.metrics ?? {}) as Record<string, number | null>,
    [overview],
  );
  const knowledge = (overview?.knowledge ?? {}) as Record<string, number>;
  const stats = useMemo(
    () => [
      ["Enquiries handled", metrics.conversations ?? 0, InboxIcon],
      ["AI-resolved", metrics.aiResolutions ?? 0, Sparkles],
      ["Open now", metrics.open ?? 0, Clock3],
      [
        "First response",
        metrics.firstResponseMinutes == null
          ? "—"
          : `${metrics.firstResponseMinutes}m`,
        Activity,
      ],
    ],
    [metrics],
  );
  if (!overview) return <Loading />;
  return (
    <ModuleShell
      eyebrow="ResolveX 2.0"
      title="Customer operations, in one place."
      copy="See the outcomes that matter, then move directly into the conversation, employee, call, relationship, or workflow responsible."
      tone="#edf1ea"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, Icon]) => {
          const I = Icon as typeof Activity;
          return (
            <div
              key={String(label)}
              className="rounded-[9px] border border-black/8 bg-white p-5"
            >
              <I size={16} className="text-[#355cff]" />
              <p className="mt-7 text-[10px] font-bold uppercase tracking-[.1em] text-[#858a92]">
                {label as string}
              </p>
              <p className="mt-1 text-3xl font-semibold">{String(value)}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-[11px] bg-[#15171b] p-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#d8ff70]">
            Today’s operating system
          </p>
          <h3 className="mt-4 text-2xl font-semibold">
            Conversations become completed work.
          </h3>
          <p className="mt-3 max-w-xl text-xs leading-5 text-white/45">
            Arlo answers from approved knowledge, uses connected tools within
            policy, pauses for approval, and hands context to a person when
            judgment is needed.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-2">
            {[
              ["inbox", "Open inbox"],
              ["employees", "Manage employees"],
              ["calls", "Review calls"],
              ["flows", "Inspect flows"],
            ].map(([view, label]) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className="flex h-10 items-center justify-between rounded-[6px] border border-white/10 px-3 text-[10px] font-semibold hover:bg-white/5"
              >
                {label}
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-[11px] border border-black/8 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#858a92]">
            Readiness
          </p>
          {[
            ["Approved knowledge", knowledge.approved ?? 0],
            ["Knowledge pages", knowledge.pages ?? 0],
            [
              "Active flows",
              Number(
                (overview.automations as Record<string, number> | undefined)
                  ?.enabled ?? 0,
              ),
            ],
            [
              "Connected systems",
              Number(
                (overview.integrations as Record<string, number> | undefined)
                  ?.connected ?? 0,
              ),
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="flex items-center justify-between border-b border-black/7 py-3 text-xs"
            >
              <span className="text-[#737881]">{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
      </div>
    </ModuleShell>
  );
}

function InboxIcon({ size, className }: { size?: number; className?: string }) {
  return <Users size={size} className={className} />;
}

export function ChannelsView() {
  return (
    <ModuleShell
      eyebrow="Settings"
      title="Channels"
      copy="Only channels with verified authentication and required permissions can be marked active."
      tone="#f4f5f6"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          [
            "Website chat",
            "Available",
            "Install the ResolveX messenger from workspace settings.",
          ],
          [
            "Email",
            "Setup required",
            "Connect Gmail through ResolveX Connect or configure inbound email.",
          ],
          [
            "AI voice",
            "Employee required",
            "Activate a voice-enabled AI employee and test in the browser.",
          ],
          [
            "Telephone",
            "Number required",
            "Complete number authorization, compliance, SIP routing, and a real test call.",
          ],
          [
            "WhatsApp",
            "Not connected",
            "Requires an approved provider account and verified sender.",
          ],
          [
            "Instagram & Messenger",
            "Not connected",
            "Requires Meta permissions and a verified connection.",
          ],
        ].map(([name, status, copy]) => (
          <article
            key={name}
            className="rounded-[9px] border border-black/10 bg-white p-5"
          >
            <div className="flex justify-between gap-3">
              <b className="text-sm">{name}</b>
              <span className="rounded-full bg-[#f0f1f3] px-2 py-1 text-[9px] font-bold">
                {status}
              </span>
            </div>
            <p className="mt-6 text-xs leading-5 text-[#7a7f88]">{copy}</p>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
