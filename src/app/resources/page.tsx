import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FileQuestion,
  GitCompareArrows,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Practical guides for planning, buying, launching, and operating AI customer support.",
};

const resources = [
  {
    icon: Calculator,
    type: "Calculator",
    title: "Model your support bill",
    copy: "Compare full-agent seats and AI resolutions with an equivalent Intercom setup.",
    href: "/pricing#calculator",
    tone: "bg-[#d8ff70]",
  },
  {
    icon: GitCompareArrows,
    type: "Buyer guide",
    title: "ResolveX vs Intercom",
    copy: "Compare pricing structure, knowledge controls, migration, voice, and operational ownership.",
    href: "/compare/intercom",
    tone: "bg-[#c5dcff]",
  },
  {
    icon: Sparkles,
    type: "Playbook",
    title: "Where Arlo should resolve",
    copy: "A practical boundary between safe AI resolution, drafted replies, and human-only work.",
    href: "#ai-resolution",
    tone: "bg-[#ffd3c8]",
  },
  {
    icon: LifeBuoy,
    type: "Documentation",
    title: "Set up your workspace",
    copy: "Connect knowledge, publish a help center, and install the messenger without a sales call.",
    href: "/help",
    tone: "bg-white",
  },
  {
    icon: FileQuestion,
    type: "FAQ",
    title: "Commercial and product questions",
    copy: "Straight answers about trials, billing, AI usage, migration, security, and cancellation.",
    href: "/faq",
    tone: "bg-white",
  },
  {
    icon: ShieldCheck,
    type: "Trust",
    title: "Security boundaries",
    copy: "Review the controls already available and the provider configuration required for production channels.",
    href: "/security",
    tone: "bg-white",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-20 pt-40 sm:px-6 md:pb-28 md:pt-48">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            Resource library
          </div>
          <h1 className="mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] md:text-8xl">
            Make the support decision with the numbers visible.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#666970]">
            No gated PDFs. Use the calculators, comparisons, implementation
            guides, and product documentation before you create a workspace.
          </p>
        </div>
      </section>
      <section className="px-4 pb-24 sm:px-6 md:pb-32">
        <div className="mx-auto grid max-w-[1240px] gap-3 md:grid-cols-2 lg:grid-cols-3">
          {resources.map(({ icon: Icon, type, title, copy, href, tone }) => (
            <Link
              key={title}
              href={href}
              className={`group flex min-h-[330px] flex-col rounded-[8px] border border-black/10 p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,35,45,.13)] ${tone}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-black/45">
                  {type}
                </span>
                <Icon size={20} />
              </div>
              <div className="mt-auto">
                <h2 className="text-3xl font-semibold leading-[1.02]">
                  {title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-black/58">
                  {copy}
                </p>
                <span className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em]">
                  Open resource{" "}
                  <ArrowRight
                    size={14}
                    className="transition group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section
        id="ai-resolution"
        className="bg-[#101114] px-4 py-24 text-white sm:px-6 md:py-32"
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <BookOpen className="text-[#d8ff70]" />
            <h2 className="mt-6 text-5xl font-semibold leading-[.95] md:text-6xl">
              What counts as an AI resolution?
            </h2>
          </div>
          <div className="space-y-px overflow-hidden rounded-[8px] border border-white/10 bg-white/10">
            {[
              [
                "Resolved",
                "Arlo answers from approved knowledge and the customer leaves without requesting a person.",
              ],
              [
                "Not resolved",
                "Arlo drafts a reply, asks a clarifying question, or hands the conversation to an agent.",
              ],
              [
                "Never hidden",
                "Usage events remain visible so billing can be checked against the conversations that created it.",
              ],
            ].map(([title, copy]) => (
              <div key={title} className="bg-[#101114] p-6">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/44">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
