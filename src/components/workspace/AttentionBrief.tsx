"use client";

import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type AttentionItem = {
  id: string;
  source: "gmail" | "slack";
  sender: string;
  subject: string;
  preview: string;
  intent: string;
  confidence: number;
  urgency: number;
  needsHuman: number;
  url: string | null;
};

export function AttentionBrief({
  compact = false,
  onOpenIntegrations,
}: {
  compact?: boolean;
  onOpenIntegrations?: () => void;
}) {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [connected, setConnected] = useState({ gmail: false, slack: false });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/attention", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not load attention brief.");
      setItems(data.items ?? []);
      setConnected(data.connected ?? { gmail: false, slack: false });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load attention brief.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const connectedCount = Number(connected.gmail) + Number(connected.slack);
  return (
    <section
      className={
        compact
          ? "border-b border-white/8 bg-[#0d1017] p-4"
          : "mb-5 rounded-[11px] border border-black/8 bg-[#101319] p-5 text-white"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#d8ff70]">
            Needs your attention today
          </p>
          {!compact && (
            <p className="mt-1 text-xs text-white/45">
              Live Gmail and Slack signals are classified on demand. ResolveX
              stores no mailbox copy.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh attention brief"
          className="grid size-8 shrink-0 place-items-center rounded-[6px] border border-white/10 text-white/55"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
        </button>
      </div>
      {!connectedCount && !loading && (
        <button
          type="button"
          onClick={onOpenIntegrations}
          className="mt-4 flex w-full items-center justify-between rounded-[7px] border border-white/10 p-3 text-left text-xs text-white/65"
        >
          Connect Gmail or Slack to build the brief
          <ArrowRight size={13} />
        </button>
      )}
      <div className="mt-3 space-y-2">
        {items.slice(0, compact ? 3 : 5).map((item) => (
          <a
            key={item.id}
            href={item.url ?? undefined}
            target={item.url ? "_blank" : undefined}
            rel={item.url ? "noreferrer" : undefined}
            className="block rounded-[7px] border border-white/8 bg-white/[.045] p-3"
          >
            <div className="flex items-center gap-2">
              {item.needsHuman >= 0.65 ? (
                <AlertCircle size={13} className="shrink-0 text-[#ff9c89]" />
              ) : (
                <Mail size={13} className="shrink-0 text-[#96d8ff]" />
              )}
              <b className="min-w-0 flex-1 truncate text-xs">{item.subject}</b>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] uppercase text-white/55">
                {item.intent}
              </span>
            </div>
            {!compact && (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                {item.preview || item.sender}
              </p>
            )}
            <p className="mt-2 text-[9px] text-white/30">
              {item.source.toUpperCase()} · {Math.round(item.confidence * 100)}%
              decision confidence
            </p>
          </a>
        ))}
        {!loading && connectedCount > 0 && !items.length && (
          <p className="rounded-[7px] border border-white/8 p-3 text-xs text-white/45">
            Nothing urgent was found in the connected sources.
          </p>
        )}
      </div>
    </section>
  );
}
