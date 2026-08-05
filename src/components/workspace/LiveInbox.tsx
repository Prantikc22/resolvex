"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquareText,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CallCustomerDialog } from "@/components/workspace/CallCustomerDialog";

type LiveMessage = {
  id: string;
  sender_type: "contact" | "agent" | "ai" | "system";
  body: string;
  is_internal: boolean;
  created_at: string;
};
type LiveConversation = {
  id: string;
  subject: string | null;
  status: string;
  priority: string;
  ai_state: string;
  sentiment: string | null;
  tags: string[];
  last_message_at: string;
  contact: {
    name: string;
    email: string | null;
    company: string | null;
    phone: string | null;
  } | null;
  inbox: { name: string; channel: string } | null;
  messages: LiveMessage[];
};

export function LiveInbox() {
  const [items, setItems] = useState<LiveConversation[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load inbox");
      setItems(data.conversations);
      setSelected((value) => value || data.conversations[0]?.id || "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load inbox",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  const current = useMemo(
    () => items.find((item) => item.id === selected) ?? items[0],
    [items, selected],
  );

  async function act(
    body: { action: "resolve" } | { action: "reply"; body: string },
  ) {
    if (!current) return;
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      if (body.action === "resolve") {
        setItems((value) => value.filter((item) => item.id !== current.id));
        setSelected(items.find((item) => item.id !== current.id)?.id ?? "");
        toast.success("Conversation resolved");
      } else {
        setItems((value) =>
          value.map((item) =>
            item.id === current.id
              ? { ...item, messages: [...item.messages, data.message] }
              : item,
          ),
        );
        setReply("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (reply.trim()) void act({ action: "reply", body: reply.trim() });
  }

  if (loading)
    return (
      <div className="grid h-full place-items-center bg-[#f5f6f8]">
        <Loader2 className="animate-spin text-[#355cff]" />
      </div>
    );
  if (!current) return <EmptyInbox />;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 bg-[#11151e] text-white lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_280px]">
      <aside className="min-h-0 overflow-y-auto border-r border-white/8">
        <div className="sticky top-0 z-10 border-b border-white/8 bg-[#11151e] p-4">
          <h2 className="text-sm font-semibold">Open conversations</h2>
          <p className="mt-1 text-[10px] text-white/35">
            {items.length} waiting or in progress
          </p>
        </div>
        {items.map((item) => {
          const latest = item.messages.at(-1);
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={cn(
                "w-full border-b border-white/7 p-4 text-left transition",
                current.id === item.id
                  ? "bg-white text-[#151619]"
                  : "hover:bg-white/[.04]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <b className="truncate text-xs">
                  {item.contact?.name ?? "Website visitor"}
                </b>
                <span
                  className={cn(
                    "text-[9px]",
                    current.id === item.id ? "text-black/38" : "text-white/28",
                  )}
                >
                  {new Date(item.last_message_at).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-2 truncate text-[11px] font-medium">
                {item.subject ?? "Support conversation"}
              </div>
              <p
                className={cn(
                  "mt-2 line-clamp-2 text-[10px] leading-relaxed",
                  current.id === item.id ? "text-black/48" : "text-white/35",
                )}
              >
                {latest?.body ?? "No message yet"}
              </p>
            </button>
          );
        })}
      </aside>

      <section className="flex min-h-0 flex-col bg-[#f5f6f8] text-[#171a20]">
        <header className="flex items-center justify-between border-b border-black/8 bg-white px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              {current.subject ?? "Support conversation"}
            </h2>
            <p className="mt-1 text-[10px] text-[#858b95]">
              {current.inbox?.name ?? "Website chat"} ·{" "}
              {current.ai_state === "handed_off"
                ? "Human attention requested"
                : "Arlo available"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCallOpen(true)}
              className="flex h-9 items-center gap-2 rounded-[5px] border border-black/10 bg-white px-3 text-[10px] font-semibold text-[#303641] hover:border-black/20"
            >
              <Phone size={13} />
              Call
            </button>
            <button
              disabled={sending}
              onClick={() => void act({ action: "resolve" })}
              className="flex h-9 items-center gap-2 rounded-[5px] bg-[#eafbd2] px-3 text-[10px] font-semibold text-[#3d7e18]"
            >
              <CheckCircle2 size={13} />
              Resolve
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-2xl space-y-4">
            {current.messages
              .filter((message) => !message.is_internal)
              .map((message) => (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender_type !== "contact" && "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-[7px] px-4 py-3 text-sm leading-relaxed",
                      message.sender_type === "contact"
                        ? "border border-black/8 bg-white"
                        : message.sender_type === "ai"
                          ? "bg-[#d8ff70] text-[#1d2908]"
                          : "bg-[#17191d] text-white",
                    )}
                  >
                    <div className="mb-2 text-[9px] font-bold uppercase tracking-[.08em] opacity-45">
                      {message.sender_type === "ai"
                        ? "Arlo"
                        : message.sender_type === "contact"
                          ? (current.contact?.name ?? "Customer")
                          : "Your team"}
                    </div>
                    {message.body}
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
        <form
          onSubmit={submit}
          className="border-t border-black/8 bg-white p-3"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[7px] border border-black/10 bg-[#fafafa] p-2 focus-within:border-[#355cff]">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Reply to customer"
              className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button
              disabled={!reply.trim() || sending}
              className="grid size-10 place-items-center rounded-[6px] bg-[#355cff] text-white disabled:bg-[#d6d9df]"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </section>

      <aside className="hidden border-l border-white/8 bg-[#0d1017] p-5 xl:block">
        <span className="grid size-11 place-items-center rounded-full bg-[#c8ff73] text-xs font-bold text-[#213308]">
          {(current.contact?.name ?? "Website visitor")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <h3 className="mt-5 font-semibold">
          {current.contact?.name ?? "Website visitor"}
        </h3>
        <p className="mt-1 text-xs text-white/35">
          {current.contact?.email ?? "Anonymous website session"}
        </p>
        {current.contact?.phone && (
          <a
            href={`tel:${current.contact.phone.replace(/[^+\d]/g, "")}`}
            className="mt-2 block text-xs text-[#d8ff70] hover:underline"
          >
            {current.contact.phone}
          </a>
        )}
        <div className="mt-8 space-y-4 border-t border-white/8 pt-5 text-xs">
          <div>
            <span className="block text-[9px] uppercase text-white/25">
              Company
            </span>
            <span className="mt-1 block text-white/65">
              {current.contact?.company ?? "Not provided"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-white/25">
              Channel
            </span>
            <span className="mt-1 block capitalize text-white/65">
              {current.inbox?.channel ?? "chat"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-white/25">
              Priority
            </span>
            <span className="mt-1 block capitalize text-white/65">
              {current.priority}
            </span>
          </div>
        </div>
      </aside>
      <AnimatePresence>
        {callOpen && (
          <CallCustomerDialog
            customer={current.contact?.name ?? "Website visitor"}
            initialNumber={current.contact?.phone}
            onClose={() => setCallOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-[#f5f6f8] p-6 text-[#171a20]">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-[8px] bg-[#101114] text-[#d8ff70]">
          <Inbox size={23} />
        </span>
        <h2 className="mt-6 text-3xl font-semibold">Your inbox is ready.</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#747a85]">
          Install the messenger or connect a production channel. New
          conversations will appear here with Arlo’s answer and source attached.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/install"
            className="flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#101114] px-4 text-xs font-semibold text-white"
          >
            Install messenger <ArrowRight size={14} />
          </Link>
          <Link
            href="/help"
            className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-black/10 bg-white px-4 text-xs font-semibold"
          >
            <MessageSquareText size={14} />
            Open setup guide
          </Link>
        </div>
        <div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-[#858b95]">
          <Sparkles size={13} className="text-[#ff5c35]" />
          Demo records are available only in the interactive demo.
        </div>
      </div>
    </div>
  );
}
