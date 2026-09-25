"use client";

/* eslint-disable @typescript-eslint/no-unused-vars -- legacy knowledge view remains available during the source-manager rollout */

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bell,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  CreditCard,
  Copy,
  Filter,
  Inbox,
  LayoutDashboard,
  Link2,
  Loader2,
  Menu,
  Moon,
  MoreHorizontal,
  PanelRightClose,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  RefreshCw,
  LogOut,
  Users,
  Phone,
  BriefcaseBusiness,
  ListTodo,
  Radio,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Logo, Mark } from "@/components/brand/Logo";
import {
  automations,
  chartData,
  conversations as initialConversations,
  integrations,
  knowledgeArticles,
  type Conversation,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { KnowledgeManager } from "@/components/workspace/KnowledgeManager";
import { LiveInbox } from "@/components/workspace/LiveInbox";
import { TeamBillingView } from "@/components/workspace/TeamBillingView";
import { TeamManagementView } from "@/components/workspace/TeamManagementView";
import {
  ArloLiveView,
  AutomationsLiveView,
  CustomersLiveView,
  IntegrationsLiveView,
  ReportsLiveView,
} from "@/components/workspace/WorkspaceOperations";
import {
  AIEmployeesView,
  ApprovalsView,
  CallsView,
  ChannelsView,
  ConnectView,
  OverviewDashboard,
  UsageView,
} from "@/components/workspace/ResolveXModules";
import { PhoneNumbersView } from "@/components/workspace/PhoneNumbersView";
import { SalesCRMView } from "@/components/workspace/SalesCRMView";

type View =
  | "overview"
  | "inbox"
  | "calls"
  | "contacts"
  | "pipeline"
  | "sequences"
  | "activities"
  | "employees"
  | "knowledge"
  | "approvals"
  | "tasks"
  | "flows"
  | "customers"
  | "analytics"
  | "integrations"
  | "usage"
  | "team"
  | "channels"
  | "phone_numbers"
  | "settings";

const nav: { id: View; label: string; icon: typeof Inbox; group: string }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "RESOLVEX",
  },
  { id: "inbox", label: "Inbox", icon: Inbox, group: "COMMUNICATION" },
  { id: "calls", label: "Calls", icon: Phone, group: "COMMUNICATION" },
  { id: "contacts", label: "Contacts", icon: Users, group: "CRM" },
  { id: "pipeline", label: "Pipeline", icon: BriefcaseBusiness, group: "CRM" },
  { id: "sequences", label: "Sequences", icon: Workflow, group: "CRM" },
  { id: "activities", label: "Activities", icon: Activity, group: "CRM" },
  { id: "employees", label: "AI Employees", icon: Bot, group: "AI WORKFORCE" },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    group: "AI WORKFORCE",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ShieldCheck,
    group: "AI WORKFORCE",
  },
  { id: "tasks", label: "Tasks", icon: ListTodo, group: "OPERATIONS" },
  { id: "flows", label: "Flows", icon: Workflow, group: "OPERATIONS" },
  { id: "integrations", label: "Integrations", icon: Link2, group: "BUSINESS" },
  { id: "analytics", label: "Analytics", icon: Activity, group: "BUSINESS" },
  {
    id: "usage",
    label: "Usage & billing",
    icon: CreditCard,
    group: "BUSINESS",
  },
  { id: "team", label: "Team", icon: Users, group: "SETTINGS" },
  { id: "channels", label: "Channels", icon: Radio, group: "SETTINGS" },
  {
    id: "phone_numbers",
    label: "Phone Numbers",
    icon: Phone,
    group: "SETTINGS",
  },
  {
    id: "settings",
    label: "Business Profile",
    icon: Settings,
    group: "SETTINGS",
  },
];

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "blue" | "amber";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-white/55",
    green: "border-[#a0df62]/20 bg-[#c8ff73]/10 text-[#b9f778]",
    red: "border-[#ff735c]/20 bg-[#ff735c]/10 text-[#ff9c89]",
    blue: "border-[#96d8ff]/20 bg-[#96d8ff]/10 text-[#a8deff]",
    amber: "border-[#ffd66b]/20 bg-[#ffd66b]/10 text-[#ffe099]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] border px-2 py-1 text-[10px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function Sidebar({
  active,
  onChange,
  collapsed,
  setCollapsed,
  userName,
  workspaceName,
  demo,
}: {
  active: View;
  onChange: (view: View) => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  userName: string;
  workspaceName: string;
  demo: boolean;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log out");
      setSigningOut(false);
    }
  }
  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-white/8 bg-[#0b0d12] p-3 text-white md:flex",
        collapsed ? "w-[72px]" : "w-[224px]",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        {collapsed ? (
          <Mark className="size-8 bg-transparent" />
        ) : (
          <Logo inverse href="/app" />
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="grid size-8 place-items-center rounded-[5px] text-white/35 hover:bg-white/5 hover:text-white"
          >
            <PanelRightClose size={17} />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 grid size-8 place-items-center rounded-[5px] text-white/35 hover:bg-white/5 hover:text-white"
        >
          <Menu size={17} />
        </button>
      )}
      <div className="scrollbar-none mt-4 flex-1 space-y-1 overflow-y-auto">
        {(demo
          ? nav.filter((item) =>
              [
                "inbox",
                "employees",
                "knowledge",
                "flows",
                "contacts",
                "analytics",
                "integrations",
                "team",
                "settings",
              ].includes(item.id),
            )
          : nav
        ).map((item, index, items) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {!collapsed && item.group !== items[index - 1]?.group && (
                <div
                  className={cn(
                    "px-3 pb-1 text-[10px] font-bold tracking-[.15em] text-white/55",
                    index > 0 && "pt-3",
                  )}
                >
                  {item.group}
                </div>
              )}
              <button
                onClick={() => onChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex h-10 w-full items-center rounded-[5px] text-sm transition",
                  collapsed ? "justify-center" : "gap-3 px-3",
                  active === item.id
                    ? "bg-white text-[#101114]"
                    : "text-white/45 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={15} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && demo && item.id === "inbox" && (
                  <span className="ml-auto rounded-full bg-[#355cff] px-1.5 py-0.5 text-[9px] font-bold text-white">
                    3
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div
        className={cn(
          "rounded-[6px] border border-white/8 bg-white/[.035]",
          collapsed ? "p-2" : "p-3",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c8ff73] text-xs font-bold text-[#183308]">
            {userName
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">{userName}</div>
              <div className="mt-0.5 truncate text-[10px] text-white/35">
                {workspaceName}
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            title="Log out"
            aria-label="Log out"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[5px] text-white/40 hover:bg-white/8 hover:text-white disabled:opacity-40",
              collapsed ? "hidden" : "ml-auto",
            )}
          >
            {signingOut ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  demo,
  onMenu,
  workspaceName,
  darkMode,
  onToggleTheme,
}: {
  title: string;
  demo: boolean;
  onMenu: () => void;
  workspaceName: string;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [notifications, setNotifications] = useState(false);
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#dfe2e8] bg-white px-3 text-[#101114] md:px-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="grid size-9 place-items-center rounded-[5px] border border-black/10 md:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="hidden text-[10px] text-[#858b95] sm:block">
            {workspaceName} · {demo ? "All systems healthy" : "Live workspace"}
          </p>
        </div>
        {demo && (
          <span className="rounded-[4px] bg-[#fff2d2] px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#8a5800]">
            Interactive demo
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? "Use light mode" : "Use dark mode"}
          title={darkMode ? "Use light mode" : "Use dark mode"}
          className="grid size-9 place-items-center rounded-[5px] border border-black/10"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {demo && (
          <>
            <button className="hidden h-9 items-center gap-2 rounded-[5px] border border-black/10 px-3 text-xs text-[#717783] lg:flex">
              <Search size={14} /> Search{" "}
              <span className="ml-7 flex items-center gap-0.5 rounded-[3px] bg-[#f1f2f4] px-1.5 py-0.5 font-mono text-[9px]">
                <Command size={9} />K
              </span>
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifications((value) => !value)}
                className="relative grid size-9 place-items-center rounded-[5px] border border-black/10"
              >
                <Bell size={16} />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#ff5b45] ring-2 ring-white" />
              </button>
              <AnimatePresence>
                {notifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="absolute right-0 top-11 w-[310px] rounded-[7px] border border-black/10 bg-white p-2 shadow-2xl"
                  >
                    <div className="flex items-center justify-between px-2 py-2">
                      <b className="text-xs">Notifications</b>
                      <span className="text-[10px] text-[#355cff]">
                        Mark all read
                      </span>
                    </div>
                    {[
                      [
                        "SLA needs attention",
                        "Sana Khan · 18 minutes remaining",
                      ],
                      [
                        "AI resolved a conversation",
                        "Lena Park · data export prepared",
                      ],
                      ["Knowledge gap detected", "Team invite permissions"],
                    ].map(([title, copy], i) => (
                      <div
                        key={title}
                        className="flex gap-3 rounded-[5px] p-2.5 hover:bg-[#f5f6f8]"
                      >
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            i === 0 ? "bg-[#ff735c]" : "bg-[#355cff]",
                          )}
                        />
                        <div>
                          <div className="text-xs font-semibold">{title}</div>
                          <div className="mt-1 text-[10px] text-[#7b818b]">
                            {copy}
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="grid size-9 place-items-center rounded-[5px] border border-black/10">
              <CircleHelp size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function ConversationList({
  items,
  selected,
  setSelected,
}: {
  items: Conversation[];
  selected: string;
  setSelected: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    `${item.customer} ${item.subject} ${item.company}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="flex min-h-0 flex-col border-r border-white/8 bg-[#11151e]">
      <div className="border-b border-white/8 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Priority inbox</h2>
            <p className="mt-1 text-[10px] text-white/35">
              12 open · 3 need attention
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-[5px] border border-white/10 text-white/45 hover:text-white">
            <SlidersHorizontal size={14} />
          </button>
        </div>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-[5px] border border-white/8 bg-black/15 px-2 text-white/35">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25"
          />
        </div>
      </div>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            className={cn(
              "w-full border-b border-white/7 p-3 text-left transition hover:bg-white/[.04]",
              selected === item.id && "bg-white/[.07]",
            )}
          >
            <div className="flex gap-2.5">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#101114]",
                  item.sentiment === "positive"
                    ? "bg-[#c8ff73]"
                    : item.sentiment === "frustrated"
                      ? "bg-[#ffb49f]"
                      : "bg-[#b9d8ff]",
                )}
              >
                {item.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-xs",
                      item.unread
                        ? "font-semibold text-white"
                        : "text-white/65",
                    )}
                  >
                    {item.customer}
                  </span>
                  <span className="text-[9px] text-white/28">{item.time}</span>
                </div>
                <div
                  className={cn(
                    "mt-1 truncate text-[11px]",
                    item.unread ? "text-white/75" : "text-white/45",
                  )}
                >
                  {item.subject}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      item.priority === "urgent"
                        ? "bg-[#ff735c]"
                        : item.priority === "high"
                          ? "bg-[#ffd66b]"
                          : "bg-white/20",
                    )}
                  />
                  <span className="truncate text-[9px] text-white/28">
                    {item.company} · {item.channel}
                  </span>
                  {item.unread && (
                    <span className="ml-auto size-1.5 rounded-full bg-[#5d79ff]" />
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationPane({
  conversation,
  onResolve,
}: {
  conversation: Conversation;
  onResolve: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([
    {
      side: "customer",
      text:
        conversation.id === "R-1842"
          ? "Hi, can we move from monthly to annual billing without losing our current discount?"
          : conversation.preview.replace("...", "?"),
      time: "10:42",
    },
  ]);
  function writeWithAI() {
    setThinking(true);
    setTimeout(() => {
      setDraft(
        conversation.id === "R-1842"
          ? "Yes. Your current 15% discount carries over, and annual billing adds another 8%. I can prepare the change for your approval now."
          : "Thanks for flagging this. I checked the relevant account details and the approved support guidance. Here is the safest next step...",
      );
      setThinking(false);
      toast.success("Draft grounded in 2 approved sources");
    }, 900);
  }
  function send() {
    if (!draft.trim()) return;
    setMessages((value) => [
      ...value,
      { side: "agent", text: draft, time: "Now" },
    ]);
    setDraft("");
    toast.success("Reply sent");
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-[#f5f6f8] text-[#171a20]">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-black/8 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">
              {conversation.subject}
            </h2>
            <span className="font-mono text-[9px] text-[#9aa0aa]">
              {conversation.id}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#7d838d]">
            <span>{conversation.customer}</span>
            <span>·</span>
            <span>{conversation.company}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResolve}
            className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[#eafbd2] px-2.5 text-[10px] font-semibold text-[#397613]"
          >
            <Check size={13} />
            Resolve
          </button>
          <button className="grid size-8 place-items-center rounded-[5px] border border-black/10">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3 text-[9px] uppercase tracking-[.08em] text-[#999faa]">
            <span className="h-px w-12 bg-black/10" />
            Today
            <span className="h-px w-12 bg-black/10" />
          </div>
          {messages.map((message, index) => (
            <motion.div
              key={`${message.time}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mb-4 flex gap-2.5",
                message.side === "agent" && "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-[7px] p-3.5 text-xs leading-relaxed shadow-sm",
                  message.side === "agent"
                    ? "bg-[#121722] text-white"
                    : "border border-black/8 bg-white",
                )}
              >
                <p>{message.text}</p>
                <div
                  className={cn(
                    "mt-2 text-[9px]",
                    message.side === "agent"
                      ? "text-white/35"
                      : "text-[#9aa0aa]",
                  )}
                >
                  {message.time}
                </div>
              </div>
            </motion.div>
          ))}
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="my-6 rounded-[7px] border border-[#355cff]/15 bg-[#edf1ff] p-4"
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.08em] text-[#355cff]">
                <Sparkles size={13} />
                AI brief
              </div>
              <div className="mt-3 grid gap-3 text-xs leading-relaxed text-[#4e5667] sm:grid-cols-2">
                <p>
                  <b className="text-[#1c2330]">Intent:</b>{" "}
                  {conversation.tags[0]} request
                </p>
                <p>
                  <b className="text-[#1c2330]">Sentiment:</b>{" "}
                  {conversation.sentiment}
                </p>
                <p className="sm:col-span-2">
                  <b className="text-[#1c2330]">Suggested path:</b> Answer from
                  approved policy, then prepare the account action for customer
                  approval.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="border-t border-black/8 bg-white p-3">
        <div className="mx-auto max-w-3xl rounded-[7px] border border-black/12 bg-white shadow-sm focus-within:border-[#355cff] focus-within:ring-4 focus-within:ring-[#355cff]/8">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to customer..."
            className="block min-h-20 w-full resize-none bg-transparent p-3 text-xs outline-none"
          />
          <div className="flex items-center justify-between border-t border-black/7 px-2 py-2">
            <div className="flex items-center gap-1">
              <button className="grid size-8 place-items-center rounded-[4px] text-[#757b86] hover:bg-[#f2f3f5]">
                <Paperclip size={15} />
              </button>
              <button className="grid size-8 place-items-center rounded-[4px] text-[#757b86] hover:bg-[#f2f3f5]">
                <AtSign size={15} />
              </button>
              <button
                onClick={writeWithAI}
                disabled={thinking}
                className="flex h-8 items-center gap-1.5 rounded-[4px] bg-[#edf1ff] px-2.5 text-[10px] font-semibold text-[#355cff]"
              >
                <WandSparkles size={13} />
                {thinking ? "Thinking..." : "Write with AI"}
              </button>
            </div>
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="flex h-8 items-center gap-2 rounded-[5px] bg-[#101114] px-3 text-[10px] font-semibold text-white disabled:opacity-35"
            >
              Send <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextPane({ conversation }: { conversation: Conversation }) {
  return (
    <aside className="scrollbar-none hidden min-h-0 overflow-y-auto border-l border-white/8 bg-[#11151e] p-4 text-white xl:block">
      <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-white/35">
        Customer
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-[#b9d8ff] text-xs font-bold text-[#12233c]">
          {conversation.initials}
        </span>
        <div>
          <div className="text-sm font-semibold">{conversation.customer}</div>
          <div className="mt-1 text-[10px] text-white/35">
            {conversation.company}
          </div>
          <span className="mt-1.5 block text-[10px] text-white/35">
            {conversation.phone}
          </span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          ["Plan", "ResolveX One"],
          ["MRR", "$1,920"],
          ["Since", "Oct 2025"],
          ["Health", "92 / 100"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[5px] border border-white/8 bg-white/[.035] p-3"
          >
            <div className="text-[9px] text-white/30">{label}</div>
            <div className="mt-2 text-xs font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="my-5 h-px bg-white/8" />
      <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-white/35">
        Conversation
      </div>
      <div className="mt-4 space-y-3 text-xs">
        <div className="flex justify-between">
          <span className="text-white/35">Assignee</span>
          <span>{conversation.assignee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/35">Priority</span>
          <span className="capitalize">{conversation.priority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/35">SLA</span>
          <span
            className={
              conversation.priority === "urgent"
                ? "text-[#ff9c89]"
                : "text-[#c8ff73]"
            }
          >
            {conversation.priority === "urgent" ? "18m remaining" : "On track"}
          </span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {conversation.tags.map((tag) => (
          <Badge key={tag} tone="blue">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="my-5 h-px bg-white/8" />
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-white/35">
          Recent activity
        </div>
        <ChevronRight size={14} className="text-white/25" />
      </div>
      <div className="mt-4 space-y-4">
        {[
          ["Plan upgraded", "14 days ago"],
          ["Invited 3 teammates", "18 days ago"],
          ["SSO configured", "1 month ago"],
        ].map(([title, time]) => (
          <div key={title} className="flex gap-3">
            <span className="mt-1 size-1.5 rounded-full bg-[#96d8ff]" />
            <div>
              <div className="text-[11px]">{title}</div>
              <div className="mt-1 text-[9px] text-white/30">{time}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InboxView() {
  const [items, setItems] = useState(initialConversations);
  const [selected, setSelected] = useState(items[0].id);
  const current = items.find((item) => item.id === selected) ?? items[0];
  function resolve() {
    setItems((value) => value.filter((item) => item.id !== current.id));
    setSelected(items.find((item) => item.id !== current.id)?.id ?? "");
    toast.success(`${current.id} resolved`);
  }
  if (!current)
    return (
      <div className="grid h-full place-items-center bg-[#f5f6f8]">
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-[#4d9a20]" />
          <h2 className="mt-4 font-semibold">Inbox clear</h2>
          <p className="mt-2 text-sm text-[#747a85]">
            Every customer has an answer.
          </p>
        </div>
      </div>
    );
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 text-white lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_260px]">
      <ConversationList
        items={items}
        selected={selected}
        setSelected={setSelected}
      />
      <ConversationPane
        key={current.id}
        conversation={current}
        onResolve={resolve}
      />
      <ContextPane conversation={current} />
    </div>
  );
}

function Stat({
  label,
  value,
  change,
  color = "blue",
}: {
  label: string;
  value: string;
  change: string;
  color?: "blue" | "green" | "coral";
}) {
  return (
    <div className="rounded-[7px] border border-white/8 bg-white/[.035] p-5">
      <div className="text-xs text-white/35">{label}</div>
      <div className="mt-5 flex items-end justify-between">
        <div className="text-3xl font-semibold tracking-[-.04em]">{value}</div>
        <span
          className={cn(
            "text-[10px] font-semibold",
            color === "green"
              ? "text-[#c8ff73]"
              : color === "coral"
                ? "text-[#ff9c89]"
                : "text-[#96d8ff]",
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

function AIView() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(88);
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#0e1118] p-4 text-white md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="green">Arlo · Live</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em]">
              Resolve routine work safely.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
              Control what the AI knows, when it answers, and which actions
              require a person.
            </p>
          </div>
          <button
            onClick={() => setEnabled((value) => !value)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-[6px] px-4 text-xs font-semibold",
              enabled
                ? "bg-[#c8ff73] text-[#20380e]"
                : "bg-white/8 text-white/55",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                enabled ? "bg-[#3c7c15]" : "bg-white/30",
              )}
            />
            {enabled ? "Agent active" : "Agent paused"}
          </button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="AI resolutions"
            value="1,284"
            change="+18%"
            color="green"
          />
          <Stat label="Resolution rate" value="61.7%" change="+7.4%" />
          <Stat label="Human handoffs" value="182" change="-12%" />
          <Stat
            label="Estimated saved"
            value="96h"
            change="This month"
            color="green"
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_.85fr]">
          <div className="rounded-[7px] border border-white/8 bg-white/[.035] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Confidence threshold</h3>
                <p className="mt-1 text-xs text-white/35">
                  Answers below this score move to a person.
                </p>
              </div>
              <span className="font-mono text-xl text-[#c8ff73]">
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="99"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-8 w-full accent-[#c8ff73]"
            />
            <div className="mt-3 flex justify-between text-[9px] text-white/25">
              <span>More automation</span>
              <span>More review</span>
            </div>
            <div className="mt-8 grid gap-2 sm:grid-cols-3">
              {[
                ["Billing questions", "Auto-answer"],
                ["Account changes", "Approval"],
                ["Refunds > $500", "Human only"],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className="rounded-[5px] border border-white/8 p-3"
                >
                  <div className="text-[10px] text-white/30">{label}</div>
                  <div
                    className={cn(
                      "mt-3 text-xs font-semibold",
                      i === 0
                        ? "text-[#c8ff73]"
                        : i === 1
                          ? "text-[#96d8ff]"
                          : "text-[#ff9c89]",
                    )}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[7px] border border-white/8 bg-white/[.035] p-5 md:p-6">
            <h3 className="text-sm font-semibold">Recent decisions</h3>
            <div className="mt-5 space-y-4">
              {[
                ["Annual billing change", "Resolved", "98%"],
                ["SSO metadata error", "Handoff", "72%"],
                ["Data export request", "Resolved", "96%"],
                ["Charge dispute", "Handoff", "68%"],
              ].map(([title, status, score]) => (
                <div key={title} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full",
                      status === "Resolved"
                        ? "bg-[#c8ff73]/10 text-[#c8ff73]"
                        : "bg-[#ff735c]/10 text-[#ff9c89]",
                    )}
                  >
                    {status === "Resolved" ? (
                      <Check size={13} />
                    ) : (
                      <ArrowRight size={13} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">{title}</div>
                    <div className="mt-1 text-[9px] text-white/30">
                      {status}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-white/35">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeView() {
  const [query, setQuery] = useState("");
  const filtered = knowledgeArticles.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-4 text-[#171a20] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Knowledge
            </h2>
            <p className="mt-2 text-sm text-[#747a85]">
              The approved source behind every AI and human answer.
            </p>
          </div>
          <button
            onClick={() => toast.success("New article draft created")}
            className="flex h-10 items-center gap-2 rounded-[6px] bg-[#101114] px-4 text-xs font-semibold text-white"
          >
            <Plus size={14} />
            New article
          </button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            ["Approved articles", "128", "+12 this month"],
            ["AI answer coverage", "91%", "+4.2%"],
            ["Knowledge gaps", "7", "3 high impact"],
          ].map(([label, value, copy], i) => (
            <div
              key={label}
              className="rounded-[7px] border border-black/10 bg-white p-5"
            >
              <div className="text-xs text-[#858b95]">{label}</div>
              <div className="mt-5 text-3xl font-semibold">{value}</div>
              <div
                className={cn(
                  "mt-2 text-[10px]",
                  i === 2 ? "text-[#c24b38]" : "text-[#3e8218]",
                )}
              >
                {copy}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-[7px] border border-black/10 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-black/8 p-3">
            <div className="flex h-9 max-w-sm flex-1 items-center gap-2 rounded-[5px] border border-black/10 px-3">
              <Search size={14} className="text-[#8b919b]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 text-xs outline-none"
                placeholder="Search approved knowledge"
              />
            </div>
            <button className="grid size-9 place-items-center rounded-[5px] border border-black/10">
              <Filter size={14} />
            </button>
          </div>
          <div className="hidden grid-cols-[1fr_120px_100px_100px] gap-3 border-b border-black/7 bg-[#fafafa] px-4 py-3 text-[9px] font-semibold uppercase tracking-[.08em] text-[#8b919b] sm:grid">
            <span>Article</span>
            <span>Status</span>
            <span>Used</span>
            <span>Updated</span>
          </div>
          {filtered.map((article) => (
            <button
              key={article.title}
              className="grid w-full gap-2 border-b border-black/7 px-4 py-4 text-left hover:bg-[#fafafa] sm:grid-cols-[1fr_120px_100px_100px] sm:items-center"
            >
              <div>
                <div className="text-xs font-semibold">{article.title}</div>
                <div className="mt-1 text-[10px] text-[#8b919b]">
                  {article.collection}
                </div>
              </div>
              <span
                className={cn(
                  "w-fit rounded-[4px] px-2 py-1 text-[9px] font-semibold",
                  article.status === "Healthy"
                    ? "bg-[#eafbd2] text-[#3d7e18]"
                    : "bg-[#fff2d2] text-[#9a6500]",
                )}
              >
                {article.status}
              </span>
              <span className="text-xs text-[#666d78]">
                {article.used} answers
              </span>
              <span className="text-[10px] text-[#8b919b]">
                {article.updated}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutomationsView() {
  const [items, setItems] = useState(automations);
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#0e1118] p-4 text-white md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="blue">Workflow engine</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em]">
              Automations
            </h2>
            <p className="mt-2 text-sm text-white/40">
              Route, enrich, answer, act, and escalate without hiding the logic.
            </p>
          </div>
          <button
            onClick={() => toast.success("Automation builder opened")}
            className="flex h-10 items-center gap-2 rounded-[6px] bg-white px-4 text-xs font-semibold text-[#101114]"
          >
            <Plus size={14} />
            New automation
          </button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Stat label="Runs this month" value="876" change="+21%" />
          <Stat
            label="Hours saved"
            value="65h"
            change="Estimated"
            color="green"
          />
          <Stat label="Failed runs" value="3" change="0.3%" color="coral" />
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <motion.div
              layout
              key={item.name}
              className="rounded-[7px] border border-white/8 bg-white/[.035] p-4 md:p-5"
            >
              <div className="flex flex-wrap items-start gap-4">
                <button
                  onClick={() =>
                    setItems((value) =>
                      value.map((entry, i) =>
                        i === index ? { ...entry, on: !entry.on } : entry,
                      ),
                    )
                  }
                  className={cn(
                    "mt-0.5 flex h-6 w-10 items-center rounded-full p-1 transition",
                    item.on
                      ? "justify-end bg-[#c8ff73]"
                      : "justify-start bg-white/12",
                  )}
                >
                  <span className="size-4 rounded-full bg-[#101114]" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    {item.on ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge>Paused</Badge>
                    )}
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-[5px] border border-white/8 bg-black/15 p-3">
                      <div className="text-[9px] uppercase tracking-[.08em] text-white/25">
                        When
                      </div>
                      <div className="mt-2 text-xs text-white/65">
                        {item.trigger}
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="hidden self-center text-white/20 md:block"
                    />
                    <div className="rounded-[5px] border border-white/8 bg-black/15 p-3">
                      <div className="text-[9px] uppercase tracking-[.08em] text-white/25">
                        Then
                      </div>
                      <div className="mt-2 text-xs text-white/65">
                        {item.action}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-sm">{item.runs}</div>
                  <div className="mt-1 text-[9px] text-white/25">
                    runs · {item.saved} saved
                  </div>
                </div>
                <button className="grid size-8 place-items-center rounded-[5px] text-white/30 hover:bg-white/5">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-4 text-[#171a20] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Service quality
            </h2>
            <p className="mt-2 text-sm text-[#747a85]">
              Outcomes, not activity theatre.
            </p>
          </div>
          <button className="flex h-10 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-4 text-xs font-semibold">
            Last 7 days <ChevronDown size={14} />
          </button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Resolved", "664", "+14%"],
            ["AI resolved", "393", "59.2%"],
            ["First reply", "5m 12s", "-21%"],
            ["CSAT", "4.86 / 5", "+0.12"],
          ].map(([label, value, copy]) => (
            <div
              key={label}
              className="rounded-[7px] border border-black/10 bg-white p-5"
            >
              <div className="text-xs text-[#858b95]">{label}</div>
              <div className="mt-5 text-3xl font-semibold tracking-[-.04em]">
                {value}
              </div>
              <div className="mt-2 text-[10px] text-[#3e8218]">{copy}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[7px] border border-black/10 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Resolution volume</h3>
              <p className="mt-1 text-[10px] text-[#858b95]">
                Human and AI resolutions by day
              </p>
            </div>
            <div className="flex gap-4 text-[10px] text-[#747a85]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#355cff]" />
                Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#76ad38]" />
                AI
              </span>
            </div>
          </div>
          <div className="mt-8 h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#355cff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#355cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#76ad38" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#76ad38" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f3" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#89909a", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#89909a", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid #dfe2e8",
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#355cff"
                  strokeWidth={2}
                  fill="url(#resolved)"
                />
                <Area
                  type="monotone"
                  dataKey="ai"
                  stroke="#76ad38"
                  strokeWidth={2}
                  fill="url(#ai)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[
            [
              "Top resolution topics",
              [
                ["Billing", 184, "28%"],
                ["Account access", 126, "19%"],
                ["Technical", 112, "17%"],
                ["Orders", 97, "15%"],
              ],
            ],
            [
              "Quality watchlist",
              [
                ["SSO configuration", 14, "Needs article"],
                ["Invite permissions", 11, "Knowledge gap"],
                ["Refund exceptions", 8, "High handoff"],
              ],
            ],
          ].map(([title, rows]) => (
            <div
              key={title as string}
              className="rounded-[7px] border border-black/10 bg-white p-5"
            >
              <h3 className="text-sm font-semibold">{title as string}</h3>
              <div className="mt-5 space-y-4">
                {(rows as (string | number)[][]).map((row, index) => (
                  <div key={row[0]} className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-[4px] bg-[#f0f2f5] font-mono text-[9px]">
                      0{index + 1}
                    </span>
                    <span className="flex-1 text-xs">{row[0]}</span>
                    <span className="text-[10px] text-[#858b95]">
                      {row[1]} · {row[2]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomersView() {
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-4 text-[#171a20] md:p-7">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-[-.04em]">Customers</h2>
        <p className="mt-2 text-sm text-[#747a85]">
          The people and accounts behind every conversation.
        </p>
        <div className="mt-7 overflow-hidden rounded-[7px] border border-black/10 bg-white">
          {initialConversations.map((customer, index) => (
            <button
              key={customer.id}
              className="grid w-full gap-4 border-b border-black/7 p-4 text-left hover:bg-[#fafafa] sm:grid-cols-[1fr_140px_130px_120px] sm:items-center"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-xs font-bold",
                    index % 3 === 0
                      ? "bg-[#c8ff73]"
                      : index % 3 === 1
                        ? "bg-[#b9d8ff]"
                        : "bg-[#ffb49f]",
                  )}
                >
                  {customer.initials}
                </span>
                <div>
                  <div className="text-xs font-semibold">
                    {customer.customer}
                  </div>
                  <div className="mt-1 text-[10px] text-[#858b95]">
                    {customer.company}
                  </div>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-[#858b95] sm:hidden">Plan · </span>
                ResolveX One
              </div>
              <div className="text-xs">
                <span className="text-[#858b95] sm:hidden">
                  Conversations ·{" "}
                </span>
                {12 - index}
              </div>
              <div>
                <span
                  className={cn(
                    "rounded-[4px] px-2 py-1 text-[9px] font-semibold",
                    customer.sentiment === "frustrated"
                      ? "bg-[#ffe7e2] text-[#a43b2a]"
                      : "bg-[#eafbd2] text-[#3d7e18]",
                  )}
                >
                  {customer.sentiment === "frustrated"
                    ? "Needs attention"
                    : "Healthy"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsView() {
  const [connected, setConnected] = useState(
    integrations.map((item) => item.status === "Connected"),
  );
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-4 text-[#171a20] md:p-7">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-[-.04em]">
          Integrations
        </h2>
        <p className="mt-2 text-sm text-[#747a85]">
          Give support the context and actions it needs.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item, index) => (
            <div
              key={item.name}
              className="flex min-h-[190px] flex-col rounded-[7px] border border-black/10 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <span
                  style={{ backgroundColor: item.color }}
                  className="grid size-11 place-items-center rounded-[7px] text-sm font-bold"
                >
                  {item.mark}
                </span>
                <Badge tone={connected[index] ? "green" : "neutral"}>
                  {connected[index] ? "Connected" : item.status}
                </Badge>
              </div>
              <h3 className="mt-8 text-lg font-semibold">{item.name}</h3>
              <p className="mt-1 text-xs text-[#858b95]">{item.category}</p>
              <button
                disabled={item.status === "Coming next"}
                onClick={() => {
                  setConnected((value) =>
                    value.map((entry, i) => (i === index ? !entry : entry)),
                  );
                  toast.success(
                    connected[index]
                      ? `${item.name} disconnected`
                      : `${item.name} connection ready`,
                  );
                }}
                className="mt-auto flex h-9 items-center justify-between border-t border-black/8 pt-3 text-xs font-semibold disabled:text-[#aaa]"
              >
                {connected[index] ? "Manage" : "Connect"}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsView({
  identity,
  billingConfigured,
  onManageBilling,
}: {
  identity: WorkspaceIdentity;
  billingConfigured: boolean;
  onManageBilling: () => void;
}) {
  const [retention, setRetention] = useState("18 months");
  const [workspaceName, setWorkspaceName] = useState(identity.workspaceName);
  const [supportEmail, setSupportEmail] = useState(identity.supportEmail);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/settings", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error);
        setWorkspaceName(data.name);
        setSupportEmail(data.supportEmail);
        setRetention(data.retention);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not load settings.",
        ),
      );
  }, []);
  useEffect(() => {
    const press = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("button, a, [role='button']")) return;
      if ("vibrate" in navigator) navigator.vibrate(8);
    };
    document.addEventListener("pointerdown", press, { passive: true });
    return () => document.removeEventListener("pointerdown", press);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName, supportEmail, retention }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not save settings.");
      toast.success("Workspace settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-4 text-[#171a20] md:p-7">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-[-.04em]">
          Workspace settings
        </h2>
        <p className="mt-2 text-sm text-[#747a85]">
          Identity, security, billing, and data controls.
        </p>
        <div className="mt-7 space-y-4">
          <MessengerSettings />
          <section className="rounded-[7px] border border-black/10 bg-white p-5 md:p-6">
            <h3 className="text-sm font-semibold">Workspace identity</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[10px] font-semibold text-[#747a85]">
                  Workspace name
                </span>
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  className="h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs outline-none focus:border-[#355cff]"
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-semibold text-[#747a85]">
                  Support email
                </span>
                <input
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                  className="h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs outline-none focus:border-[#355cff]"
                />
              </label>
            </div>
          </section>
          <section className="rounded-[7px] border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-[6px] bg-[#eafbd2] text-[#3d7e18]">
                <ShieldCheck size={17} />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Data and security</h3>
                <p className="mt-1 text-[10px] text-[#858b95]">
                  Control how long customer conversations remain available.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-black/7 pt-5">
              <div>
                <div className="text-xs font-semibold">
                  Conversation retention
                </div>
                <div className="mt-1 text-[10px] text-[#858b95]">
                  Deleted automatically after this period.
                </div>
              </div>
              <select
                value={retention}
                onChange={(e) => setRetention(e.target.value)}
                className="h-10 rounded-[5px] border border-black/10 bg-white px-3 text-xs"
              >
                <option>6 months</option>
                <option>12 months</option>
                <option>18 months</option>
                <option>Indefinite</option>
              </select>
            </div>
          </section>
          <section className="rounded-[7px] border border-black/10 bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[6px] bg-[#edf1ff] text-[#355cff]">
                  <CreditCard size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Billing</h3>
                  <p className="mt-1 text-[10px] text-[#858b95]">
                    ResolveX One · USD ·{" "}
                    {billingConfigured
                      ? "Billing connected"
                      : "Billing setup required"}
                  </p>
                </div>
              </div>
              <button
                onClick={onManageBilling}
                className="h-9 rounded-[5px] bg-[#101114] px-3 text-xs font-semibold text-white"
              >
                {billingConfigured ? "Manage payment" : "View setup"}
              </button>
            </div>
          </section>
          <button
            disabled={saving}
            onClick={() => void save()}
            className="h-11 rounded-[6px] bg-[#101114] px-5 text-xs font-semibold text-white"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessengerSettings() {
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({
    accent: "#ff5c35",
    headerColor: "#111318",
    agentName: "Arlo",
    welcomeTitle: "How can we help?",
    welcomeMessage:
      "Ask naturally. We answer from approved knowledge or bring in a person.",
    logoUrl: "",
    position: "right" as "left" | "right",
    websiteVoiceEnabled: false,
    humanHandoffEnabled: true,
  });

  useEffect(() => {
    fetch("/api/workspace/widget")
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok)
          throw new Error(data.error ?? "Could not load messenger settings");
        setKey(data.key);
        setEnabled(data.enabled);
        setBranding({
          accent: data.accent ?? "#ff5c35",
          headerColor: data.headerColor ?? "#111318",
          agentName: data.agentName ?? "Arlo",
          welcomeTitle: data.welcomeTitle ?? "How can we help?",
          welcomeMessage: data.welcomeMessage ?? "",
          logoUrl: data.logoUrl ?? "",
          position: data.position === "left" ? "left" : "right",
          websiteVoiceEnabled: Boolean(data.websiteVoiceEnabled),
          humanHandoffEnabled: data.humanHandoffEnabled !== false,
        });
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load messenger settings",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function update(
    body:
      | { action: "rotate" }
      | { action: "toggle"; enabled: boolean }
      | ({ action: "customize" } & typeof branding),
  ) {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Update failed");
      setKey(data.key);
      setEnabled(data.enabled);
      if (body.action === "customize") {
        const { action: _action, ...nextBranding } = body;
        setBranding(nextBranding);
      }
      toast.success(
        body.action === "rotate"
          ? "Messenger key rotated"
          : body.action === "customize"
            ? "Messenger branding saved"
            : data.enabled
              ? "Messenger enabled"
              : "Messenger paused",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const snippet = `<script src="https://www.getresolvex.com/resolvex-widget.js" data-workspace="${key || "YOUR_PUBLIC_WIDGET_KEY"}" async></script>`;

  return (
    <section className="rounded-[7px] border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Website messenger</h3>
          <p className="mt-1 text-[10px] text-[#858b95]">
            This public key selects your workspace. It is not a database
            credential.
          </p>
        </div>
        <button
          disabled={loading}
          onClick={() => void update({ action: "toggle", enabled: !enabled })}
          className={cn(
            "h-8 rounded-[5px] px-3 text-[10px] font-semibold",
            enabled
              ? "bg-[#eafbd2] text-[#3d7e18]"
              : "bg-[#eeeef0] text-[#656a73]",
          )}
        >
          {enabled ? "Messenger live" : "Messenger paused"}
        </button>
      </div>
      <div className="mt-5 rounded-[6px] bg-[#101114] p-4 text-[#d8ff70]">
        <code className="block break-all text-[10px] leading-relaxed">
          {loading ? "Loading workspace key..." : snippet}
        </code>
      </div>
      <div className="mt-5 border-t border-black/8 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Brand and voice</h4>
            <p className="mt-1 text-xs text-[#858b95]">
              These settings update every installed widget without changing the
              script tag.
            </p>
          </div>
          <div
            className="size-10 rounded-full border-4 border-white shadow-md"
            style={{ backgroundColor: branding.accent }}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold">
            Assistant name
            <input
              value={branding.agentName}
              onChange={(event) =>
                setBranding((value) => ({
                  ...value,
                  agentName: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-[6px] border border-black/10 px-3 font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Logo URL
            <input
              value={branding.logoUrl}
              onChange={(event) =>
                setBranding((value) => ({
                  ...value,
                  logoUrl: event.target.value,
                }))
              }
              placeholder="https://…/logo.png"
              className="mt-2 h-11 w-full rounded-[6px] border border-black/10 px-3 font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Accent colour
            <div className="mt-2 flex h-11 items-center gap-2 rounded-[6px] border border-black/10 px-2">
              <input
                type="color"
                value={branding.accent}
                onChange={(event) =>
                  setBranding((value) => ({
                    ...value,
                    accent: event.target.value,
                  }))
                }
                className="size-8 border-0 bg-transparent"
              />
              <span className="text-xs">{branding.accent}</span>
            </div>
          </label>
          <label className="text-xs font-semibold">
            Header colour
            <div className="mt-2 flex h-11 items-center gap-2 rounded-[6px] border border-black/10 px-2">
              <input
                type="color"
                value={branding.headerColor}
                onChange={(event) =>
                  setBranding((value) => ({
                    ...value,
                    headerColor: event.target.value,
                  }))
                }
                className="size-8 border-0 bg-transparent"
              />
              <span className="text-xs">{branding.headerColor}</span>
            </div>
          </label>
          <label className="text-xs font-semibold md:col-span-2">
            Welcome heading
            <input
              value={branding.welcomeTitle}
              onChange={(event) =>
                setBranding((value) => ({
                  ...value,
                  welcomeTitle: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-[6px] border border-black/10 px-3 font-normal"
            />
          </label>
          <label className="text-xs font-semibold md:col-span-2">
            Welcome message
            <textarea
              rows={3}
              value={branding.welcomeMessage}
              onChange={(event) =>
                setBranding((value) => ({
                  ...value,
                  welcomeMessage: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-[6px] border border-black/10 p-3 font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Launcher position
            <select
              value={branding.position}
              onChange={(event) =>
                setBranding((value) => ({
                  ...value,
                  position: event.target.value === "left" ? "left" : "right",
                }))
              }
              className="mt-2 h-11 w-full rounded-[6px] border border-black/10 px-3 font-normal"
            >
              <option value="right">Bottom right</option>
              <option value="left">Bottom left</option>
            </select>
          </label>
          <div className="grid gap-2 rounded-[8px] border border-black/10 p-3 md:col-span-2 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-xs font-semibold">
              <span>
                Website voice
                <small className="mt-1 block font-normal text-[#858b95]">
                  ElevenLabs only · AI voice disclosed in the widget
                </small>
              </span>
              <input
                type="checkbox"
                checked={branding.websiteVoiceEnabled}
                onChange={(event) =>
                  setBranding((value) => ({
                    ...value,
                    websiteVoiceEnabled: event.target.checked,
                  }))
                }
                className="size-4 accent-[#355cff]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold">
              <span>
                Human handoff
                <small className="mt-1 block font-normal text-[#858b95]">
                  Creates a real queue item in the ResolveX inbox
                </small>
              </span>
              <input
                type="checkbox"
                checked={branding.humanHandoffEnabled}
                onChange={(event) =>
                  setBranding((value) => ({
                    ...value,
                    humanHandoffEnabled: event.target.checked,
                  }))
                }
                className="size-4 accent-[#355cff]"
              />
            </label>
          </div>
          <button
            disabled={loading}
            onClick={() => void update({ action: "customize", ...branding })}
            className="mt-auto h-11 rounded-[6px] bg-[#101114] px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save widget design"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!key || loading}
          onClick={async () => {
            await navigator.clipboard.writeText(snippet);
            toast.success("Install snippet copied");
          }}
          className="flex h-9 items-center gap-2 rounded-[5px] border border-black/10 px-3 text-[10px] font-semibold"
        >
          <Copy size={13} />
          Copy snippet
        </button>
        <button
          disabled={loading}
          onClick={() => void update({ action: "rotate" })}
          className="flex h-9 items-center gap-2 rounded-[5px] border border-black/10 px-3 text-[10px] font-semibold text-[#6d727c]"
        >
          <RefreshCw size={13} />
          Rotate key
        </button>
      </div>
    </section>
  );
}

const viewTitles: Record<View, string> = {
  overview: "Overview",
  inbox: "Inbox",
  calls: "Calls",
  contacts: "Contacts",
  pipeline: "Pipeline",
  sequences: "Sequences",
  activities: "Activities",
  employees: "AI Employees",
  knowledge: "Knowledge",
  approvals: "Approvals",
  tasks: "Tasks",
  flows: "Flows",
  customers: "Customers",
  analytics: "Analytics",
  integrations: "Integrations",
  usage: "Usage & billing",
  team: "Team",
  channels: "Channels",
  phone_numbers: "Phone Numbers",
  settings: "Business Profile",
};

function WorkspaceSetupView({
  view,
}: {
  view:
    "employees" | "flows" | "contacts" | "analytics" | "integrations" | "team";
}) {
  const content: Record<
    "employees" | "flows" | "contacts" | "analytics" | "integrations" | "team",
    { title: string; copy: string; action: string }
  > = {
    employees: {
      title: "Arlo is waiting for approved knowledge.",
      copy: "Import a website or PDF, approve the source, then install the messenger. Arlo will not answer factual questions before that boundary is in place.",
      action: "Open knowledge",
    },
    flows: {
      title: "Create rules after the first conversation arrives.",
      copy: "Automation storage is ready, but this workspace has no live rules yet. Use the demo to inspect routing and approval interactions.",
      action: "Open product demo",
    },
    contacts: {
      title: "Customer profiles build from real conversations.",
      copy: "The first messenger, email, form, or API conversation creates the profile and keeps its history together here.",
      action: "Install messenger",
    },
    analytics: {
      title: "Reports begin with live support events.",
      copy: "Resolution, response time, CSAT, AI usage, and SLA metrics will appear after this workspace has real conversations.",
      action: "Open product demo",
    },
    integrations: {
      title: "Connect providers deliberately.",
      copy: "The demo shows the intended interaction. Production connections need provider OAuth credentials, tenant-safe callbacks, and a successful test event.",
      action: "Read integration setup",
    },
    team: {
      title: "Team billing activates with live checkout.",
      copy: "Invite, role, seat, invoice, and cancellation flows must use the configured billing and email providers. Demo teammates are never shown in a live workspace.",
      action: "Review pricing",
    },
  };
  const item = content[view];
  const href =
    view === "contacts"
      ? "/install"
      : view === "team"
        ? "/pricing"
        : view === "employees"
          ? "/help"
          : view === "flows" || view === "analytics"
            ? "/demo"
            : "/help";
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-[#f5f6f8] p-6 text-[#171a20]">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-[8px] bg-[#101114] text-[#d8ff70]">
          <Sparkles size={22} />
        </span>
        <h2 className="mt-6 text-3xl font-semibold">{item.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#747a85]">
          {item.copy}
        </p>
        <Link
          href={href}
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#101114] px-4 text-xs font-semibold text-white"
        >
          {item.action}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

type WorkspaceIdentity = {
  workspaceName: string;
  supportEmail: string;
  userName: string;
};
type WorkspaceCapabilities = {
  billing: boolean;
};

export function Workspace({
  demo = false,
  identity = {
    workspaceName: "Acme workspace",
    supportEmail: "support@acme.co",
    userName: "Prantik Mazumder",
  },
  capabilities = { billing: false },
}: {
  demo?: boolean;
  identity?: WorkspaceIdentity;
  capabilities?: WorkspaceCapabilities;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(demo ? "inbox" : "overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "view",
    ) as View | null;
    if (requested && nav.some((item) => item.id === requested)) {
      queueMicrotask(() => setView(requested));
    }
  }, []);
  useEffect(() => {
    const saved = window.localStorage.getItem("resolvex-theme");
    if (saved === "dark") queueMicrotask(() => setDarkMode(true));
    const haptic = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, [role='button']")) navigator.vibrate?.(8);
    };
    document.addEventListener("pointerdown", haptic, { passive: true });
    return () => document.removeEventListener("pointerdown", haptic);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.workspaceTheme = darkMode
      ? "dark"
      : "light";
    return () => {
      delete document.documentElement.dataset.workspaceTheme;
    };
  }, [darkMode]);
  const content = useMemo(() => {
    switch (view) {
      case "overview":
        return (
          <OverviewDashboard onNavigate={(next) => setView(next as View)} />
        );
      case "inbox":
        return demo ? <InboxView /> : <LiveInbox onNavigate={setView} />;
      case "calls":
        return <CallsView />;
      case "contacts":
        return demo ? (
          <CustomersView />
        ) : (
          <SalesCRMView
            mode="contacts"
            onNavigate={(next) => setView(next as View)}
          />
        );
      case "pipeline":
        return (
          <SalesCRMView
            mode="pipeline"
            onNavigate={(next) => setView(next as View)}
          />
        );
      case "sequences":
        return (
          <SalesCRMView
            mode="sequences"
            onNavigate={(next) => setView(next as View)}
          />
        );
      case "activities":
        return (
          <SalesCRMView
            mode="activities"
            onNavigate={(next) => setView(next as View)}
          />
        );
      case "employees":
        return demo ? <AIView /> : <AIEmployeesView />;
      case "knowledge":
        return <KnowledgeManager demo={demo} />;
      case "approvals":
        return <ApprovalsView />;
      case "tasks":
        return (
          <SalesCRMView
            mode="tasks"
            onNavigate={(next) => setView(next as View)}
          />
        );
      case "flows":
        return demo ? <AutomationsView /> : <AutomationsLiveView />;
      case "customers":
        return demo ? (
          <CustomersView />
        ) : (
          <CustomersLiveView onInstall={() => setView("settings")} />
        );
      case "analytics":
        return demo ? <ReportsView /> : <ReportsLiveView />;
      case "integrations":
        return demo ? <IntegrationsView /> : <ConnectView />;
      case "usage":
        return demo ? <TeamBillingView /> : <UsageView />;
      case "team":
        return demo ? (
          <TeamBillingView />
        ) : (
          <TeamManagementView billingConfigured={capabilities.billing} />
        );
      case "channels":
        return <ChannelsView />;
      case "phone_numbers":
        return <PhoneNumbersView onNavigate={() => setView("approvals")} />;
      case "settings":
        return (
          <SettingsView
            identity={identity}
            billingConfigured={capabilities.billing}
            onManageBilling={() => setView("team")}
          />
        );
    }
  }, [view, demo, capabilities, identity]);
  return (
    <main
      className={cn(
        "workspace-ui flex h-screen overflow-hidden bg-[#0b0d12]",
        darkMode && "workspace-dark",
      )}
    >
      <Sidebar
        active={view}
        onChange={setView}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        userName={identity.userName}
        workspaceName={identity.workspaceName}
        demo={demo}
      />
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            onClick={() => setMobile(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
              className="h-full w-[270px] bg-[#0b0d12] p-3 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-12 items-center justify-between">
                <Logo inverse href={demo ? "/demo" : "/app"} />
                <button
                  onClick={() => setMobile(false)}
                  className="grid size-8 place-items-center"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 space-y-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id);
                        setMobile(false);
                      }}
                      className={cn(
                        "flex h-11 w-full items-center gap-3 rounded-[5px] px-3 text-sm",
                        view === item.id
                          ? "bg-white text-[#101114]"
                          : "text-white/50",
                      )}
                    >
                      <Icon size={17} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {demo && (
                <Link
                  href="/"
                  className="mt-8 flex h-10 items-center gap-2 rounded-[5px] border border-white/10 px-3 text-xs text-white/55"
                >
                  <ArrowLeft size={14} />
                  Exit demo
                </Link>
              )}
              {!demo && (
                <button
                  type="button"
                  onClick={() => {
                    void createBrowserClient()
                      .auth.signOut()
                      .then(({ error }) => {
                        if (error) throw error;
                        router.replace("/login");
                        router.refresh();
                      })
                      .catch((error) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not log out",
                        ),
                      );
                  }}
                  className="mt-8 flex h-10 w-full items-center gap-2 rounded-[5px] border border-white/10 px-3 text-xs text-white/55"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="workspace-main flex min-w-0 flex-1 flex-col">
        <Topbar
          title={viewTitles[view]}
          demo={demo}
          onMenu={() => setMobile(true)}
          workspaceName={identity.workspaceName}
          darkMode={darkMode}
          onToggleTheme={() => {
            setDarkMode((value) => {
              window.localStorage.setItem(
                "resolvex-theme",
                value ? "light" : "dark",
              );
              return !value;
            });
          }}
        />
        {content}
      </div>
    </main>
  );
}
