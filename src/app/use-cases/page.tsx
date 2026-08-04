import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HeartPulse,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "How SaaS, ecommerce, marketplaces, and service teams can use ResolveX.",
};

const cases = [
  [
    Building2,
    "SaaS support",
    "Ground product answers in docs, route account-specific work to humans, and track the knowledge gaps behind repeat tickets.",
    [
      "Product and billing questions",
      "Incident-aware macros",
      "Engineering handoff context",
    ],
  ],
  [
    ShoppingBag,
    "Ecommerce service",
    "Answer delivery and policy questions quickly while keeping refunds, cancellations, and exceptions behind approval rules.",
    [
      "Order-status guidance",
      "Returns policy answers",
      "Sensitive-action approvals",
    ],
  ],
  [
    PackageCheck,
    "Marketplaces",
    "Keep buyer and seller history together, route disputes by risk, and give operators one audit trail across channels.",
    [
      "Two-sided contact history",
      "Priority and SLA routing",
      "Escalation evidence",
    ],
  ],
  [
    HeartPulse,
    "Regulated operations",
    "Use approved sources and conservative confidence thresholds where every answer and handoff needs to be reviewable.",
    [
      "Approved knowledge only",
      "Human-only action rules",
      "Exportable conversation history",
    ],
  ],
];

export default function UseCasesPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-20 pt-40 sm:px-6 md:pt-48">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            Use cases
          </div>
          <h1 className="mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] md:text-8xl">
            One support core. Different operating rules.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#666970]">
            The inbox stays familiar. Knowledge, confidence, routing, and
            approvals change with the work your customers ask you to do.
          </p>
        </div>
      </section>
      <section className="px-4 pb-28 sm:px-6">
        <div className="mx-auto grid max-w-[1180px] gap-px overflow-hidden rounded-[8px] border border-black/10 bg-black/10 md:grid-cols-2">
          {cases.map(([Icon, title, copy, items]) => {
            const CaseIcon = Icon as typeof Building2;
            return (
              <article key={title as string} className="bg-white p-7 md:p-9">
                <CaseIcon size={22} className="text-[#ff5c35]" />
                <h2 className="mt-8 text-3xl font-semibold">
                  {title as string}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#666b74]">
                  {copy as string}
                </p>
                <div className="mt-8 space-y-3">
                  {(items as string[]).map((item) => (
                    <div
                      key={item}
                      className="border-l-2 border-[#d8ff70] pl-3 text-sm font-medium"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mx-auto mt-8 flex max-w-[1180px] justify-end">
          <Link
            href="/demo"
            className="inline-flex h-12 items-center gap-2 rounded-[6px] bg-[#101114] px-5 text-sm font-semibold text-white"
          >
            Try the product demo <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
