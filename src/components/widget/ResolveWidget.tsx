"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  CheckCheck,
  Paperclip,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Mark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: string;
};

const actions = [
  "How does pricing work?",
  "Can I import my help center?",
  "Talk to a person",
];

export function WidgetPanel({
  embedded = false,
  onClose,
  workspaceKey,
}: {
  embedded?: boolean;
  onClose?: () => void;
  workspaceKey?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("ResolveX");
  const [accent, setAccent] = useState("#ff5c35");
  const [headerColor, setHeaderColor] = useState("#111318");
  const [agentName, setAgentName] = useState("Arlo");
  const [welcomeTitle, setWelcomeTitle] = useState("How can we help?");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Ask naturally. The answer cites approved knowledge or brings in a person with the context ready.",
  );
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (!workspaceKey) return;
    const storageKey = `resolvex:session:${workspaceKey}`;
    let id = window.localStorage.getItem(storageKey);
    if (!id) {
      id = window.crypto.randomUUID();
      window.localStorage.setItem(storageKey, id);
    }
    const resolvedId = id;
    queueMicrotask(() => setSessionId(resolvedId));
    fetch(`/api/widget/config?key=${encodeURIComponent(workspaceKey)}`)
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Messenger unavailable")),
      )
      .then((data) => {
        setWorkspaceName(data.name ?? "Support");
        setAccent(data.accent ?? "#ff5c35");
        setHeaderColor(data.headerColor ?? "#111318");
        setAgentName(data.agent ?? "Arlo");
        setWelcomeTitle(data.welcomeTitle ?? "How can we help?");
        setWelcomeMessage(
          data.welcomeMessage ??
            "Ask naturally. We answer from approved knowledge or bring in a person.",
        );
        setLogoUrl(data.logoUrl ?? "");
      })
      .catch(() => setWorkspaceName("Support"));
  }, [workspaceKey]);

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const tenantMessenger = Boolean(workspaceKey && sessionId);
      const response = await fetch(
        tenantMessenger ? "/api/widget/message" : "/api/ai/support",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            tenantMessenger
              ? {
                  key: workspaceKey,
                  sessionId,
                  message: text.trim(),
                }
              : {
                  messages: next.map(({ role, content }) => ({
                    role,
                    content,
                  })),
                },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Message failed");
      setMessages((value) => [
        ...value,
        { role: "assistant", content: data.message, source: data.source },
      ]);
    } catch {
      setMessages((value) => [
        ...value,
        {
          role: "assistant",
          content:
            "I could not reach the AI service just now. I can still connect you with the team.",
          source: "Human handoff available",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex overflow-hidden rounded-[22px] border border-white/80 bg-white text-[#151619] shadow-[0_34px_110px_rgba(10,13,20,.3),0_6px_24px_rgba(10,13,20,.12)]",
        embedded
          ? "h-screen w-full flex-col rounded-none border-0"
          : "h-[min(650px,calc(100vh-7rem))] w-[min(392px,calc(100vw-1.5rem))] flex-col",
      )}
    >
      <header
        className="relative overflow-hidden px-5 pb-5 pt-5 text-white"
        style={{ backgroundColor: headerColor }}
      >
        <div className="absolute -right-14 -top-20 size-52 rounded-full bg-[#ff5c35]/18 blur-3xl" />
        <div className="absolute -bottom-24 -left-14 size-44 rounded-full bg-[#d8ff70]/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <span
                aria-label={`${workspaceName} logo`}
                className="size-10 rounded-[12px] bg-white bg-contain bg-center bg-no-repeat ring-1 ring-white/15"
                style={{
                  backgroundImage: `url("${logoUrl.replaceAll('"', "%22")}")`,
                }}
              />
            ) : (
              <Mark className="size-10 rounded-[12px] ring-1 ring-white/15" />
            )}
            <div>
              <div className="text-[15px] font-semibold tracking-[-.02em]">
                {agentName} from {workspaceName}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/48">
                <span className="size-1.5 rounded-full bg-[#b9f46b] shadow-[0_0_12px_rgba(185,244,107,.7)]" />
                Online · typically instant
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void send("I'd like to request a callback.")}
              aria-label="Call support"
              className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.06] text-white/68 transition hover:bg-white/12 hover:text-white"
            >
              <Phone size={16} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close messenger"
                className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.06] text-white/68 transition hover:bg-white/12 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f7f5f0] p-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-between">
            <div className="pt-6 text-center">
              <span
                className="mx-auto grid size-14 place-items-center rounded-[18px] text-white shadow-[0_16px_34px_rgba(20,24,35,.2)] ring-4 ring-white"
                style={{ backgroundColor: accent }}
              >
                <Sparkles size={22} />
              </span>
              <h2 className="mt-5 font-display text-[2rem] leading-none">
                {welcomeTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-[#74777e]">
                {welcomeMessage}
              </p>
            </div>
            <div className="space-y-2 pb-2">
              {actions.map((action, index) => (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 + index * 0.06 }}
                  key={action}
                  onClick={() => void send(action)}
                  className="group flex w-full items-center justify-between rounded-[12px] border border-black/7 bg-white px-4 py-3.5 text-left text-[13px] font-medium shadow-[0_8px_24px_rgba(20,24,35,.05)] transition hover:-translate-y-0.5 hover:border-black/16 hover:shadow-[0_12px_30px_rgba(20,24,35,.09)]"
                >
                  {action}
                  <span className="grid size-6 place-items-center rounded-full bg-[#fff0eb] text-[#ff5c35] transition group-hover:bg-[#ff5c35] group-hover:text-white">
                    -&gt;
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", message.role === "user" && "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-[8px] px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-[#16171a] text-white"
                      : "border border-black/8 bg-white shadow-sm",
                  )}
                >
                  <p>{message.content}</p>
                  {message.source && (
                    <div className="mt-3 flex items-center gap-1.5 border-t border-black/7 pt-2 text-[10px] text-[#6a7e38]">
                      <CheckCheck size={12} />
                      {message.source}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {thinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 rounded-[7px] border border-black/8 bg-white px-4 py-3 shadow-sm w-fit"
              >
                <span className="size-1.5 animate-bounce rounded-full bg-[#ff5c35]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[#ff5c35] [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[#ff5c35] [animation-delay:240ms]" />
              </motion.div>
            )}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="border-t border-black/8 bg-white p-3">
        <div className="rounded-[14px] border border-black/10 bg-[#fafafa] p-2 shadow-inner focus-within:border-[#ff5c35] focus-within:ring-4 focus-within:ring-[#ff5c35]/8">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            placeholder="Ask a question..."
            className="min-h-12 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Attach file"
              className="grid size-9 place-items-center rounded-full text-[#83868d] hover:bg-black/5"
            >
              <Paperclip size={16} />
            </button>
            <button
              disabled={!input.trim() || thinking}
              className="grid size-9 place-items-center rounded-full text-white transition disabled:bg-[#ddd]"
              style={{
                backgroundColor: input.trim() && !thinking ? accent : undefined,
              }}
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-center text-[10px] text-[#9a9ca1]">
          {agentName} AI · Powered by <b className="text-[#676970]">ResolveX</b>
        </div>
      </form>
    </motion.section>
  );
}

export function ResolveWidget() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <div className="absolute bottom-[76px] right-0">
            <WidgetPanel onClose={() => setOpen(false)} />
          </div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((value) => !value)}
        aria-label={
          open ? "Close ResolveX messenger" : "Open ResolveX messenger"
        }
        className={cn(
          "ml-auto flex h-15 items-center justify-center border transition-all",
          open
            ? "w-15 rounded-full border-[#ff5c35] bg-[#ff5c35] text-white shadow-[0_18px_45px_rgba(255,92,53,.35)]"
            : "gap-2.5 rounded-full border-white/12 bg-[#111318]/96 px-2 pr-4 text-white shadow-[0_20px_55px_rgba(10,13,20,.28)] backdrop-blur-xl sm:min-w-[158px]",
        )}
      >
        {open ? (
          <X size={22} />
        ) : (
          <>
            <Mark className="size-10 shrink-0 rounded-full ring-1 ring-white/14" />
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold">Ask Arlo</span>
              <span className="mt-0.5 flex items-center gap-1 text-[9px] text-white/42">
                <span className="size-1.5 rounded-full bg-[#b9f46b]" />
                AI + human support
              </span>
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}
