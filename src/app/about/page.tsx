import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Mark } from "@/components/brand/Logo";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why ResolveX exists, how Arlo works, and the ResoluteX team accountable for the product.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-24 pt-40 sm:px-6 md:pb-32 md:pt-48">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            About ResolveX
          </div>
          <h1 className="mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] md:text-8xl">
            Support software should finish more work, not create more admin.
          </h1>
          <div className="mt-10 grid gap-8 border-t border-black/10 pt-8 lg:grid-cols-2">
            <p className="max-w-xl text-lg leading-relaxed text-[#5f636b]">
              ResolveX brings conversations, approved knowledge, AI resolution,
              automation, and service reporting into one workspace. Arlo handles
              the repeatable questions and shows her sources. People keep the
              conversations that need judgement.
            </p>
            <p className="max-w-xl text-lg leading-relaxed text-[#5f636b]">
              ResolveX is built and operated by ResoluteX. The product has its
              own roadmap and pricing; the engineering, security, and long-term
              stewardship sit with an accountable software company.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="button-bright flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-6 text-sm font-semibold text-white"
            >
              Start free <ArrowRight size={15} />
            </Link>
            <a
              href={brand.parentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-14 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white px-6 text-sm font-semibold"
            >
              Visit ResoluteX <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#101114] px-4 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-white/10 bg-white/10 lg:grid-cols-3">
            {[
              [
                Sparkles,
                "Resolution before deflection",
                "Arlo is measured by complete, grounded answers, not by how many tickets she keeps away from a person.",
              ],
              [
                ShieldCheck,
                "Approval before autonomy",
                "Knowledge, confidence, and sensitive actions have explicit controls. Low-confidence work moves to a human.",
              ],
              [
                Workflow,
                "One operating picture",
                "The conversation, source, action, owner, and outcome stay together for review and reporting.",
              ],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof Sparkles;
              return (
                <div key={title as string} className="bg-[#101114] p-7 md:p-9">
                  <ItemIcon className="text-[#d8ff70]" size={22} />
                  <h2 className="mt-9 text-xl font-semibold">
                    {title as string}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/45">
                    {copy as string}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
              How the product earns trust
            </div>
            <h2 className="mt-5 text-5xl font-semibold leading-[.95] md:text-6xl">
              The answer, the evidence, and the handoff.
            </h2>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(25,30,45,.12)]">
            <div className="flex items-center justify-between border-b border-black/8 bg-[#17191e] p-5 text-white">
              <span className="flex items-center gap-3">
                <Mark />{" "}
                <span>
                  <b className="block text-sm">Arlo</b>
                  <span className="text-[10px] text-white/38">
                    Resolution review
                  </span>
                </span>
              </span>
              <span className="text-[10px] text-[#c8ff73]">92% grounded</span>
            </div>
            <div className="space-y-3 p-5">
              {[
                "Answer uses two approved knowledge sources",
                "Account-specific change requires human confirmation",
                "Conversation and decision are retained in the audit trail",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[6px] bg-[#f4f5f7] p-4 text-sm"
                >
                  <CheckCircle2 size={17} className="text-[#4f8f23]" />
                  {item}
                </div>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="border-l-2 border-[#355cff] p-3">
                  <div className="text-2xl font-semibold">6 sec</div>
                  <div className="mt-1 text-xs text-[#777d87]">
                    response in this example
                  </div>
                </div>
                <div className="border-l-2 border-[#ff5c35] p-3">
                  <div className="text-2xl font-semibold">1 click</div>
                  <div className="mt-1 text-xs text-[#777d87]">
                    to take over
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
