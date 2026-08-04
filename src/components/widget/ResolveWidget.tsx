"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  CheckCheck,
  ChevronLeft,
  MoreHorizontal,
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
        "flex overflow-hidden rounded-[8px] border border-black/10 bg-white text-[#151619] shadow-[0_30px_90px_rgba(20,24,35,.24)]",
        embedded
          ? "h-screen w-full flex-col rounded-none border-0"
          : "h-[min(680px,calc(100vh-7rem))] w-[min(410px,calc(100vw-1.5rem))] flex-col",
      )}
    >
      <header className="relative overflow-hidden bg-[#202126] px-4 pb-5 pt-4 text-white">
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#d8ff70]" />
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            className="grid size-9 place-items-center rounded-full text-white/55 hover:bg-white/8"
          >
            <ChevronLeft size={19} />
          </button>
          <div className="flex items-center gap-2">
            <Mark className="size-8" />
            <div>
              <div className="text-sm font-semibold">
                Arlo from {workspaceName}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/45">
                <span className="size-1.5 rounded-full bg-[#a7e85b]" />
                AI now. Human when needed.
              </div>
            </div>
          </div>
          <div className="flex">
            <button
              type="button"
              aria-label="Call support"
              className="grid size-9 place-items-center rounded-full text-white/55 hover:bg-white/8"
            >
              <Phone size={16} />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="grid size-9 place-items-center rounded-full text-white/55 hover:bg-white/8"
            >
              <MoreHorizontal size={17} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close messenger"
                className="grid size-9 place-items-center rounded-full text-white/55 hover:bg-white/8"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-between">
            <div className="pt-8 text-center">
              <span
                className="mx-auto grid size-16 place-items-center rounded-full text-white shadow-[0_12px_30px_rgba(20,24,35,.18)]"
                style={{ backgroundColor: accent }}
              >
                <Sparkles size={25} />
              </span>
              <h2 className="mt-5 font-display text-3xl">Ask Arlo anything.</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#74777e]">
                Ask naturally. The answer cites approved knowledge or brings in
                a person with the context ready.
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
                  className="flex w-full items-center justify-between rounded-[7px] border border-black/8 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm hover:border-black/20"
                >
                  {action}
                  <span className="text-[#ff5c35]">-&gt;</span>
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
        <div className="rounded-[7px] border border-black/12 bg-[#fafafa] p-2 focus-within:border-[#ff5c35] focus-within:ring-4 focus-within:ring-[#ff5c35]/8">
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
          Arlo AI · Powered by <b className="text-[#676970]">ResolveX</b>
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
          <div className="absolute bottom-[74px] right-0">
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
          "ml-auto grid size-15 place-items-center border transition-colors",
          open
            ? "rounded-full border-[#ff5c35] bg-[#ff5c35] text-white shadow-[0_18px_45px_rgba(255,92,53,.35)]"
            : "rounded-[15px] border-white/75 bg-white/90 shadow-[0_18px_45px_rgba(18,20,28,.2)] backdrop-blur-xl",
        )}
      >
        {open ? <X size={22} /> : <Mark className="size-10 rounded-[10px]" />}
      </motion.button>
    </div>
  );
}
