"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/lib/brand";
import { competitors } from "@/lib/competitors";

const columns = [
  {
    title: "Product",
    links: [
      ["AI employees", "/#employees"],
      ["Chat & website voice", "/#widget"],
      ["AI phone agents", "/#widget"],
      ["Knowledge & help center", "/#knowledge"],
      ["Sales CRM", "/#crm"],
      ["Attention brief", "/#attention"],
      ["Integrations", "/#integrations"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Compare",
    links: [
      ...competitors
        .filter((item) => item.popular)
        .slice(0, 7)
        .map((item) => [`vs ${item.name}`, `/compare/${item.slug}`]),
      ["All comparisons", "/compare"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Live demo", "/demo"],
      ["Install messenger", "/install"],
      ["Help center", "/help"],
      ["Resource library", "/resources"],
      ["Field notes", "/blog"],
      ["Use cases", "/use-cases"],
      ["Bill calculator", "/pricing#calculator"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About ResolveX", "/about"],
      ["ResoluteX", brand.parentUrl],
      ["Contact", "/contact"],
      ["Security", "/security"],
      ["Service status", "/status"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Cancellation & refunds", "/refund-policy"],
      ["Shipping & delivery", "/shipping-policy"],
      ["Cookie policy", "/cookie-policy"],
      ["Acceptable use", "/acceptable-use"],
      ["Data processing", "/data-processing"],
    ],
  },
];

export function MarketingFooter({ cta = true }: { cta?: boolean }) {
  return (
    <footer className="bg-[#101114] px-4 pb-7 pt-6 text-white sm:px-6">
      <div className="mx-auto max-w-[1380px]">
        {cta && (
          <div className="grid gap-8 border-b border-white/10 py-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8ff70]">
                No sales call required
              </div>
              <h2 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl">
                Put a real support desk behind your next reply.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/signup"
                className="button-bright flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-6 text-sm font-semibold"
              >
                Start 7 days free <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLButtonElement>(
                      '[aria-label="Open ResolveX messenger"]',
                    )
                    ?.click()
                }
                className="flex h-14 items-center justify-center gap-2 rounded-[6px] border border-white/18 px-6 text-sm font-semibold transition-colors hover:bg-white/8"
              >
                <MessageCircle size={16} /> Ask a question
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-12 border-b border-white/10 py-14 lg:grid-cols-[.75fr_2.25fr]">
          <div>
            <Logo inverse />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/48">
              AI resolves the routine. Your team keeps the conversations that
              need judgement, empathy, and context.
            </p>
            <a
              href={brand.parentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 border-b border-[#d8ff70]/45 pb-1 text-sm font-semibold text-[#d8ff70] transition-colors hover:border-[#d8ff70]"
            >
              A ResoluteX product <ExternalLink size={14} />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 xl:grid-cols-5">
            {columns.map((column) => (
              <div key={column.title}>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">
                  {column.title}
                </div>
                <div className="mt-5 space-y-3">
                  {column.links.map(([label, href]) => {
                    const external = href.startsWith("http");
                    return external ? (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {label} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <Link
                        key={label}
                        href={href}
                        className="block text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ResolveX. A ResoluteX product.</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Digital SaaS delivered online</span>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event("resolvex:open-consent"))
              }
              className="transition-colors hover:text-white"
            >
              Cookie settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
