"use client";

import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
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
      className={`attention-brief ${compact ? "attention-brief--compact border-b p-4" : "mb-5 rounded-[11px] border p-5"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="attention-accent text-[10px] font-bold uppercase tracking-[.12em]">
            Needs your attention today
          </p>
          {!compact && (
            <p className="attention-muted mt-1 text-xs">
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
          className="attention-control grid size-8 shrink-0 place-items-center rounded-[6px] border"
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
          className="attention-control mt-4 flex w-full items-center justify-between rounded-[7px] border p-3 text-left text-xs"
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
            className="attention-item block rounded-[7px] border p-3"
          >
            <div className="flex items-center gap-2">
              {item.needsHuman >= 0.65 ? (
                <AlertCircle size={13} className="shrink-0 text-[#ff9c89]" />
              ) : (
                <Mail size={13} className="shrink-0 text-[#96d8ff]" />
              )}
              <b className="min-w-0 flex-1 truncate text-xs">{item.subject}</b>
              <span className="attention-badge rounded-full px-2 py-0.5 text-[9px] uppercase">
                {item.intent}
              </span>
              {item.url && <ExternalLink size={12} className="opacity-45" />}
            </div>
            {!compact && (
              <p className="attention-muted mt-2 line-clamp-2 text-xs leading-5">
                {item.preview || item.sender}
              </p>
            )}
            <p className="attention-faint mt-2 text-[9px]">
              {item.source.toUpperCase()} · {Math.round(item.confidence * 100)}%
              decision confidence
            </p>
          </a>
        ))}
        {!loading && connectedCount > 0 && !items.length && (
          <p className="attention-muted rounded-[7px] border border-black/8 p-3 text-xs">
            Nothing urgent was found in the connected sources.
          </p>
        )}
      </div>
    </section>
  );
}
