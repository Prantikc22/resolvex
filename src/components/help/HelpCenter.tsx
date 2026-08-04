"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, KeyRound, Search, Settings2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { helpArticles, helpCategories } from "@/lib/help-content";

const categoryIcons = {
  "getting-started": BookOpen,
  "ai-resolutions": Sparkles,
  "plans-billing": CreditCard,
  "account-security": KeyRound,
  "channels-routing": Settings2,
};

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return [];
    return helpArticles.filter((article) =>
      [article.title, article.summary, article.category, ...article.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [normalized]);

  return (
    <section className="bg-white px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="relative z-10 flex h-16 items-center gap-3 rounded-[7px] border border-black/12 bg-[#f7f7f4] px-5 shadow-[0_18px_55px_rgba(25,30,42,.08)]">
          <Search size={19} aria-hidden="true" />
          <input
            aria-label="Search help"
            placeholder="Search setup, billing, Arlo, routing..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#97999f]"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="grid size-9 place-items-center rounded-[5px] text-[#6f7279] transition hover:bg-black/5 hover:text-black" aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {normalized ? (
          <div className="mt-10" aria-live="polite">
            <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-4">
              <h2 className="text-2xl font-semibold tracking-[-.03em]">{results.length} {results.length === 1 ? "answer" : "answers"}</h2>
              <span className="text-xs text-[#777a81]">for “{query.trim()}”</span>
            </div>
            {results.length ? (
              <div className="divide-y divide-black/9">
                {results.map((article) => {
                  const category = helpCategories.find((item) => item.slug === article.category);
                  return (
                    <Link key={article.slug} href={`/help/${article.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                      <span>
                        <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#ff5c35]">{category?.title}</span>
                        <span className="mt-2 block text-xl font-semibold tracking-[-.02em] group-hover:text-[#ff5c35]">{article.title}</span>
                        <span className="mt-2 block max-w-3xl text-sm leading-relaxed text-[#6f7279]">{article.summary}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs font-semibold">{article.readTime}<ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="border-b border-black/10 py-16 text-center">
                <p className="text-xl font-semibold">No article matches that search.</p>
                <p className="mt-2 text-sm text-[#74777e]">Try “widget”, “billing”, “Arlo”, “roles”, or “routing”.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {helpCategories.map((category) => {
                const Icon = categoryIcons[category.slug as keyof typeof categoryIcons];
                const count = helpArticles.filter((article) => article.category === category.slug).length;
                return (
                  <a key={category.slug} href={`#${category.slug}`} className="group rounded-[7px] border border-black/10 p-6 transition duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_22px_55px_rgba(25,30,42,.1)]">
                    <Icon size={21} className="text-[#ff5c35]" />
                    <h2 className="mt-5 text-xl font-semibold">{category.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#70737a]">{category.description}</p>
                    <span className="mt-6 flex items-center gap-2 text-xs font-semibold">Browse {count} articles <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
                  </a>
                );
              })}
            </div>

            <div className="mt-20 space-y-16">
              {helpCategories.map((category) => (
                <section key={category.slug} id={category.slug} className="scroll-mt-28">
                  <div className="grid gap-4 border-b border-black/12 pb-5 md:grid-cols-[.42fr_.58fr] md:items-end">
                    <h2 className="text-3xl font-semibold tracking-[-.04em]">{category.title}</h2>
                    <p className="text-sm leading-relaxed text-[#73767d]">{category.description}</p>
                  </div>
                  <div className="divide-y divide-black/9">
                    {helpArticles.filter((article) => article.category === category.slug).map((article) => (
                      <Link key={article.slug} href={`/help/${article.slug}`} className="group grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                        <span>
                          <span className="block text-lg font-semibold tracking-[-.02em] group-hover:text-[#ff5c35]">{article.title}</span>
                          <span className="mt-1.5 block max-w-3xl text-sm leading-relaxed text-[#73767d]">{article.summary}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs font-semibold text-[#565960]">{article.readTime}<ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

