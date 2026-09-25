import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import {
  categoryLabels,
  competitors,
  type CompetitorCategory,
} from "@/lib/competitors";

export const metadata: Metadata = {
  title: "Compare ResolveX with help desks, chat, CRM and voice AI tools",
  description:
    "Honest comparisons of ResolveX with Intercom, Zendesk, Freshdesk, Gorgias, Tidio, HubSpot, Pipedrive, Retell AI and more.",
  alternates: { canonical: "/compare" },
};

const order: CompetitorCategory[] = [
  "helpdesk",
  "ai-agent",
  "chat",
  "crm",
  "voice",
];

export default function CompareHub() {
  return (
    <main className="bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-16 pt-36 sm:px-6 md:pt-44">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            Compare
          </p>
          <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
            One workspace instead of
            <span className="block font-display font-normal italic text-[#85878d]">
              five separate tools.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5e66]">
            ResolveX replaces a help desk, a chat widget, an AI agent, a sales
            CRM and a voice platform. See how it compares — including when the
            other tool is the better choice.
          </p>
        </div>
      </section>
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-[1100px] space-y-12">
          {order.map((category) => (
            <div key={category}>
              <h2 className="text-2xl font-semibold tracking-[-.03em]">
                {categoryLabels[category]}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {competitors
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <Link
                      key={item.slug}
                      href={`/compare/${item.slug}`}
                      className="group rounded-[12px] border border-black/10 bg-white p-5 transition-colors hover:border-[#ff5c35]/50"
                    >
                      <div className="flex items-center justify-between text-[16px] font-semibold">
                        ResolveX vs {item.name}
                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6b6e75]">
                        {item.summary}
                      </p>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
