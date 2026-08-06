"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Source = {
  id: string;
  name: string;
  kind: "website" | "pdf" | "text" | "integration";
  source_url?: string | null;
  status: "processing" | "draft" | "ready" | "failed" | "paused";
  page_count: number;
  byte_size: number;
  last_synced_at?: string | null;
};

type HelpCenter = {
  name: string;
  slug: string;
  custom_domain: string | null;
  accent: string;
  is_published: boolean;
};

const demoSources: Source[] = [
  {
    id: "demo-web",
    name: "acme.com/help",
    kind: "website",
    status: "ready",
    page_count: 184,
    byte_size: 0,
  },
  {
    id: "demo-pdf",
    name: "Billing policy v4.pdf",
    kind: "pdf",
    status: "ready",
    page_count: 18,
    byte_size: 0,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}

export function KnowledgeManager({ demo = false }: { demo?: boolean }) {
  const [mode, setMode] = useState<"sources" | "help">("sources");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!demo);
  const [sources, setSources] = useState<Source[]>(demo ? demoSources : []);
  const [help, setHelp] = useState<HelpCenter>({
    name: "Support center",
    slug: "support",
    custom_domain: null,
    accent: "#ff5c35",
    is_published: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (demo) return;
    try {
      const [sourceResponse, helpResponse] = await Promise.all([
        fetch("/api/knowledge/sources", { cache: "no-store" }),
        fetch("/api/help-centers", { cache: "no-store" }),
      ]);
      const sourceData = await sourceResponse.json();
      const helpData = await helpResponse.json();
      if (!sourceResponse.ok)
        throw new Error(sourceData.error ?? "Could not load sources.");
      setSources(sourceData.sources ?? []);
      if (helpResponse.ok && helpData.helpCenter) setHelp(helpData.helpCenter);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load knowledge.",
      );
    } finally {
      setInitializing(false);
    }
  }, [demo]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function importWebsite(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        setSources((value) => [
          {
            id: crypto.randomUUID(),
            name: new URL(url).hostname,
            kind: "website",
            status: "draft",
            page_count: 1,
            byte_size: 0,
          },
          ...value,
        ]);
      } else {
        const response = await fetch("/api/knowledge/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Import failed.");
        setSources((value) => [data.source, ...value]);
        toast.success(
          `${data.discovered} pages imported and ready for review.`,
        );
      }
      setUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setLoading(true);
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("PDFs are limited to 20 MB.");
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        setSources((value) => [
          {
            id: crypto.randomUUID(),
            name: file.name,
            kind: "pdf",
            status: "draft",
            page_count: 1,
            byte_size: file.size,
          },
          ...value,
        ]);
      } else {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/knowledge/pdf", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Upload failed.");
        setSources((value) => [data.source, ...value]);
        toast.success("PDF extracted and ready for review.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function approve(id: string) {
    if (demo) {
      setSources((value) =>
        value.map((source) =>
          source.id === id ? { ...source, status: "ready" } : source,
        ),
      );
      return;
    }
    const response = await fetch("/api/knowledge/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error ?? "Approval failed.");
    setSources((value) =>
      value.map((source) => (source.id === id ? data.source : source)),
    );
    toast.success("Source approved. Arlo can now cite it.");
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this source and its imported articles?"))
      return;
    if (!demo) {
      const response = await fetch("/api/knowledge/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.error ?? "Delete failed.");
    }
    setSources((value) => value.filter((source) => source.id !== id));
    toast.success("Source removed.");
  }

  async function saveHelpCenter(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: help.name,
        slug: slugify(help.slug || help.name),
        customDomain: help.custom_domain || undefined,
        accent: help.accent,
        published: true,
      };
      if (!demo) {
        const response = await fetch("/api/help-centers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Could not publish help center.");
        setHelp(data.helpCenter);
      } else {
        setHelp((value) => ({
          ...value,
          slug: payload.slug,
          is_published: true,
        }));
      }
      toast.success("Help center published.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not publish help center.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-[#f5f4ef]">
        <Loader2 className="animate-spin text-[#355cff]" />
      </div>
    );
  }

  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Knowledge and help center
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              Import, review, and explicitly approve everything Arlo is allowed
              to cite.
            </p>
          </div>
          <div className="flex rounded-[6px] border border-black/10 bg-white p-1">
            {(["sources", "help"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={cn(
                  "rounded-[4px] px-3 py-2 text-xs font-semibold capitalize",
                  mode === item && "bg-[#17191d] text-white",
                )}
              >
                {item === "help" ? "Help center" : item}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "sources" ? (
            <motion.div
              key="sources"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7"
            >
              <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
                <form
                  onSubmit={importWebsite}
                  className="rounded-[8px] border border-black/10 bg-white p-5 md:p-6"
                >
                  <span className="grid size-10 place-items-center rounded-[6px] bg-[#d8ff70]">
                    <Globe2 size={18} />
                  </span>
                  <h3 className="mt-8 text-xl font-semibold">
                    Learn from your website
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#7a7d84]">
                    ResolveX reads the sitemap first, follows same-domain links,
                    and imports up to 100 readable pages per run.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <input
                      ref={urlRef}
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      type="url"
                      required
                      placeholder="https://yourcompany.com"
                      className="h-11 min-w-0 flex-1 rounded-[5px] border border-black/10 px-3 text-xs outline-none focus:border-[#ff5c35]"
                    />
                    <button
                      disabled={loading}
                      className="flex h-11 items-center gap-2 rounded-[5px] bg-[#17191d] px-4 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Globe2 size={14} />
                      )}
                      Import
                    </button>
                  </div>
                </form>
                <div className="rounded-[8px] border border-black/10 bg-[#17191d] p-5 text-white md:p-6">
                  <span className="grid size-10 place-items-center rounded-[6px] bg-[#b7d7ff] text-[#17253b]">
                    <Upload size={18} />
                  </span>
                  <h3 className="mt-8 text-xl font-semibold">
                    Add approved PDFs
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/42">
                    Text is extracted privately and stays unavailable to Arlo
                    until you approve it.
                  </p>
                  <input
                    ref={inputRef}
                    onChange={(event) => void upload(event.target.files?.[0])}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                  />
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                    className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-white text-xs font-semibold text-[#17191d] disabled:opacity-50"
                  >
                    <FileText size={14} />
                    Choose PDF
                  </button>
                  <div className="mt-3 text-[10px] text-white/25">
                    25 PDFs · 20 MB each
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[8px] border border-black/10 bg-white">
                <div className="flex items-center justify-between border-b border-black/8 p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Knowledge sources</h3>
                    <p className="mt-1 text-[10px] text-[#8a8d94]">
                      Draft sources require approval before Arlo can use them.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      urlRef.current?.focus();
                      urlRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                    aria-label="Add website source"
                    className="grid size-9 place-items-center rounded-[5px] border border-black/10"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {!sources.length && (
                  <div className="p-8 text-center text-xs text-[#858891]">
                    No sources yet. Import a website or PDF above.
                  </div>
                )}
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="grid gap-3 border-b border-black/7 p-4 sm:grid-cols-[1fr_110px_220px] sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[6px] bg-[#f0f1f3]">
                        {source.kind === "website" ? (
                          <Globe2 size={15} />
                        ) : (
                          <FileText size={15} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">
                          {source.name}
                        </div>
                        <div className="mt-1 text-[10px] text-[#8a8d94]">
                          {source.page_count}{" "}
                          {source.page_count === 1 ? "page" : "pages"} imported
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] capitalize text-[#777a82]">
                      {source.kind}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      {source.status === "draft" ? (
                        <button
                          onClick={() => void approve(source.id)}
                          className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[#d8ff70] px-3 text-[10px] font-semibold text-[#2d4b08]"
                        >
                          <Check size={12} />
                          Review & approve
                        </button>
                      ) : (
                        <span className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[#eafbd2] px-3 text-[10px] font-semibold text-[#427a1d]">
                          <Check size={11} />
                          Approved
                        </span>
                      )}
                      <button
                        onClick={() => void remove(source.id)}
                        aria-label={`Remove ${source.name}`}
                        className="grid size-8 place-items-center rounded-[5px] border border-black/10 text-[#8b8e95] hover:text-[#b63220]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7 grid gap-4 lg:grid-cols-[.75fr_1.25fr]"
            >
              <form
                onSubmit={saveHelpCenter}
                className="rounded-[8px] border border-black/10 bg-white p-5"
              >
                <h3 className="text-lg font-semibold">
                  Publish your support site
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#7a7d84]">
                  Approved knowledge becomes searchable on a public ResolveX
                  support page.
                </p>
                <div className="mt-6 space-y-4">
                  <label>
                    <span className="mb-2 block text-[10px] font-semibold">
                      Help center name
                    </span>
                    <input
                      value={help.name}
                      onChange={(event) =>
                        setHelp((value) => ({
                          ...value,
                          name: event.target.value,
                        }))
                      }
                      required
                      className="h-10 w-full rounded-[5px] border border-black/10 px-3 text-xs"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-semibold">
                      ResolveX URL
                    </span>
                    <div className="flex h-10 items-center rounded-[5px] border border-black/10 px-3 text-xs">
                      <span className="text-[#999]">
                        getresolvex.com/support/
                      </span>
                      <input
                        value={help.slug}
                        onChange={(event) =>
                          setHelp((value) => ({
                            ...value,
                            slug: slugify(event.target.value),
                          }))
                        }
                        required
                        className="min-w-0 flex-1 outline-none"
                      />
                    </div>
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-semibold">
                      Accent
                    </span>
                    <div className="flex gap-2">
                      {["#ff5c35", "#355cff", "#2b8a57", "#8c55d8"].map(
                        (color) => (
                          <button
                            type="button"
                            key={color}
                            onClick={() =>
                              setHelp((value) => ({ ...value, accent: color }))
                            }
                            style={{ background: color }}
                            className={cn(
                              "size-8 rounded-[5px] border-2 border-white ring-1",
                              help.accent === color
                                ? "ring-black"
                                : "ring-black/10",
                            )}
                          />
                        ),
                      )}
                    </div>
                  </label>
                  <button
                    disabled={loading}
                    className="mt-3 h-11 w-full rounded-[5px] bg-[#17191d] text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {help.is_published
                      ? "Update help center"
                      : "Publish help center"}
                  </button>
                  {help.is_published && (
                    <a
                      href={`/support/${help.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 items-center justify-center gap-2 rounded-[5px] border border-black/10 text-xs font-semibold"
                    >
                      Open published site <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </form>
              <div className="rounded-[8px] bg-[#17191d] p-4">
                <div className="h-full min-h-[430px] rounded-[7px] bg-[#f8f7f2] p-5">
                  <div className="flex items-center justify-between">
                    <b>{help.name}</b>
                    <span className="text-[9px] text-[#888]">
                      /support/{help.slug}
                    </span>
                  </div>
                  <div className="mx-auto max-w-md py-16 text-center">
                    <h3 className="font-display text-4xl">How can we help?</h3>
                    <div className="mt-5 flex h-12 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-3 text-xs text-[#999]">
                      <Search size={15} />
                      Search approved knowledge
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {sources
                      .filter((source) => source.status === "ready")
                      .slice(0, 3)
                      .map((source) => (
                        <div
                          key={source.id}
                          className="rounded-[6px] border border-black/8 bg-white p-4"
                        >
                          <BookOpen size={15} />
                          <div className="mt-8 line-clamp-2 text-xs font-semibold">
                            {source.name}
                          </div>
                          <div className="mt-1 text-[9px] text-[#999]">
                            {source.page_count} pages
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
