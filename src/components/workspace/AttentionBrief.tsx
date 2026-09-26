"use client";

import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AttentionItem = {
  id: string;
  source: "gmail" | "slack";
  sender: string;
  subject: string;
  preview: string;
  occurredAt: string | null;
  intent: string;
  confidence: number;
  urgency: number;
  needsHuman: number;
  automated?: boolean;
  url: string | null;
};

const intentTone: Record<string, string> = {
  billing: "bg-[#fff1c9] text-[#73520a]",
  technical: "bg-[#eef3ff] text-[#355cff]",
  sales: "bg-[#dff8bc] text-[#3e8218]",
  success: "bg-[#f1f0f8] text-[#6d4fc2]",
  general: "attention-badge",
};

/** Gmail sends epoch milliseconds or ISO strings; Slack sends epoch seconds. */
function occurred(value: string | null) {
  if (!value) return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : formatDistanceToNowStrict(date, { addSuffix: true });
}

function SourceMark({ source }: { source: AttentionItem["source"] }) {
  return (
    <span className="attention-control grid size-8 shrink-0 place-items-center rounded-[8px] border bg-white">
      {/* Toolkit marks come from the same catalog as the integrations page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://logos.composio.dev/api/${source}`}
        alt={source === "gmail" ? "Gmail" : "Slack"}
        width={16}
        height={16}
        className="size-4 object-contain"
      />
    </span>
  );
}

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
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(
        refresh ? "/api/attention?refresh=1" : "/api/attention",
        { cache: "no-store" },
      );
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
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const connectedCount = Number(connected.gmail) + Number(connected.slack);
  const needsYou = items.filter(
    (item) => item.needsHuman >= 0.65 && !item.automated,
  ).length;
  const limit = compact ? 3 : expanded ? 8 : 5;
  const sources = [connected.gmail && "Gmail", connected.slack && "Slack"]
    .filter(Boolean)
    .join(" and ");

  return (
    <section
      className={cn(
        "attention-brief",
        compact
          ? "attention-brief--compact border-b p-4"
          : "rounded-[12px] border",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          !compact && "border-b border-black/8 px-5 py-4",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {!compact && (
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[#dff8bc] text-[#3e8218]">
              <Sparkles size={15} />
            </span>
          )}
          <div className="min-w-0">
            <p
              className={cn(
                compact
                  ? "attention-accent text-[11px] font-bold uppercase tracking-[.12em]"
                  : "text-[15px] font-semibold",
              )}
            >
              Needs your attention today
            </p>
            {!compact && (
              <p className="attention-muted mt-0.5 truncate text-[13px]">
                {!loaded
                  ? "Checking your connected inboxes…"
                  : connectedCount
                    ? `${needsYou ? `${needsYou} need you · ` : ""}Read live from ${sources}. Nothing is stored.`
                    : "Connect Gmail or Slack and ResolveX triages them every morning."}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          aria-label="Refresh attention brief"
          className="attention-control grid size-8 shrink-0 place-items-center rounded-[7px] border"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {!connectedCount && !loading && (
        <div className={compact ? "mt-3" : "p-5"}>
          <button
            type="button"
            onClick={onOpenIntegrations}
            className="attention-control flex w-full items-center justify-between rounded-[8px] border p-3 text-left text-[13px] font-medium"
          >
            Connect Gmail or Slack to build the brief
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {loading && !items.length && connectedCount > 0 && (
        <div className={cn("space-y-2", compact ? "mt-3" : "p-4")}>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-14 animate-pulse rounded-[8px] bg-[#f1f2f4]"
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <ul className={compact ? "mt-3 space-y-2" : "divide-y divide-black/6"}>
          {items.slice(0, limit).map((item) => {
            const when = occurred(item.occurredAt);
            const urgent = item.needsHuman >= 0.65 && !item.automated;
            const Row = item.url ? "a" : "div";
            return (
              <li key={item.id}>
                <Row
                  {...(item.url
                    ? { href: item.url, target: "_blank", rel: "noreferrer" }
                    : {})}
                  className={cn(
                    "attention-item group flex items-start gap-3",
                    compact
                      ? "rounded-[8px] border p-3"
                      : "border-0 px-5 py-3.5",
                  )}
                >
                  {!compact && <SourceMark source={item.source} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {urgent && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-[#ff5c35]"
                          aria-label="Needs you"
                        />
                      )}
                      <span className="truncate text-[14px] font-semibold">
                        {item.subject}
                      </span>
                    </div>
                    <div className="attention-muted mt-0.5 flex items-center gap-1.5 truncate text-[13px]">
                      {item.automated && <Bot size={12} className="shrink-0" />}
                      <span className="truncate">{item.sender}</span>
                      {when && (
                        <span className="attention-faint">· {when}</span>
                      )}
                    </div>
                    {!compact && item.preview && (
                      <p className="attention-muted mt-1 line-clamp-1 text-[13px]">
                        {item.preview}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        intentTone[item.intent] ?? intentTone.general,
                      )}
                    >
                      {item.intent}
                    </span>
                    {item.confidence > 0 && (
                      <span
                        className="attention-faint text-[11px] tabular-nums"
                        title="Decision confidence"
                      >
                        {Math.round(item.confidence * 100)}% sure
                      </span>
                    )}
                  </div>
                  {item.url && !compact && (
                    <ArrowUpRight
                      size={15}
                      className="attention-faint mt-1 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  )}
                </Row>
              </li>
            );
          })}
        </ul>
      )}

      {!compact && items.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="attention-muted w-full border-t border-black/8 py-3 text-[13px] font-semibold"
        >
          {expanded
            ? "Show less"
            : `Show ${Math.min(8, items.length) - 5} more`}
        </button>
      )}

      {!loading && connectedCount > 0 && !items.length && (
        <p
          className={cn(
            "attention-muted text-[13px]",
            compact ? "mt-3" : "px-5 py-6 text-center",
          )}
        >
          All clear — nothing in {sources} needs you right now.
        </p>
      )}
    </section>
  );
}
