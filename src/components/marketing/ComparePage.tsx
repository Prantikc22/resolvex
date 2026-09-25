import { ArrowRight, Check, CircleSlash2, Play } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import {
  categoryComparison,
  categoryLabels,
  type Competitor,
  relatedCompetitors,
} from "@/lib/competitors";
import { money, pricing } from "@/lib/pricing";

export function compareFaq(competitor: Competitor) {
  return [
    [
      `Is ResolveX a good ${competitor.name} alternative?`,
      `Yes, for teams that want AI employees, a shared inbox, help center, voice and a sales CRM in one product. ${competitor.chooseThem[0]} If that describes you, ${competitor.name} may still fit better.`,
    ],
    [
      `How does ResolveX pricing compare with ${competitor.name}?`,
      `${competitor.name}: ${competitor.pricingModel} ResolveX is ${money(pricing.agent)} per agent seat per month, includes ${pricing.includedResolutions} AI resolutions, then ${money(pricing.resolution)} per completed resolution. AI voice is ${money(pricing.voicePlatformMinute)} per minute. Collaborators are free.`,
    ],
    [
      `Can I move from ${competitor.name} to ResolveX?`,
      `${competitor.migration} Standard imports are included, and you can run both side by side during the switch.`,
    ],
    [
      "Is there a free trial?",
      `Yes. Every plan starts with a ${pricing.trialDays}-day free trial of the complete product, including ${pricing.includedResolutions} AI resolutions.`,
    ],
  ] as const;
}

export function ComparePage({ competitor }: { competitor: Competitor }) {
  const rows = categoryComparison[competitor.category];
  const related = relatedCompetitors(competitor);
  const faq = compareFaq(competitor);
  return (
    <main className="bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
        <div className="mx-auto max-w-[1100px] text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-[#6b6e75]">
            <Link href="/compare" className="hover:text-[#151619]">
              Compare
            </Link>{" "}
            / {categoryLabels[competitor.category]} / {competitor.name}
          </nav>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-7xl">
            ResolveX vs {competitor.name}
            <span className="mt-2 block font-display font-normal italic text-[#ff5c35]">
              the {competitor.name} alternative with AI employees
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[#5b5e66]">
            {competitor.summary} ResolveX puts AI employees on your chat, email
            and phone — with a shared inbox, help center and sales CRM — for{" "}
            {money(pricing.agent)} per seat.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="button-bright flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-7 text-sm font-semibold text-white"
            >
              Start free trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="flex h-14 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white px-7 text-sm font-semibold"
            >
              <Play size={14} fill="currentColor" /> Try the live demo
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto grid max-w-[1100px] gap-5 md:grid-cols-2">
          <div className="rounded-[14px] bg-[#111318] p-7 text-white">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-[#d8ff70]">
              Why teams switch to ResolveX
            </div>
            <ul className="mt-6 space-y-4">
              {competitor.switchReasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-3 text-[15px] leading-relaxed text-white/80"
                >
                  <Check size={17} className="mt-0.5 shrink-0 text-[#d8ff70]" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[14px] border border-black/10 bg-[#fafaf8] p-7">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-[#6b6e75]">
              When {competitor.name} may fit better
            </div>
            <ul className="mt-6 space-y-4">
              {competitor.chooseThem.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-3 text-[15px] leading-relaxed text-[#4c4f56]"
                >
                  <CircleSlash2
                    size={17}
                    className="mt-0.5 shrink-0 text-[#9a9da4]"
                  />
                  {reason}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-black/8 pt-5 text-sm leading-relaxed text-[#6b6e75]">
              <b className="text-[#151619]">{competitor.name} pricing model:</b>{" "}
              {competitor.pricingModel}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-balance text-4xl font-semibold tracking-[-.045em] md:text-5xl">
            Side by side
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#6b6e75]">
            How ResolveX compares with {competitor.name} and other{" "}
            {categoryLabels[competitor.category].toLowerCase()}. Plans change —
            check {competitor.name}’s site for their current packaging.
          </p>
          <div className="mt-10 overflow-x-auto rounded-[14px] border border-black/10 bg-white">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="bg-[#111318] text-white">
                  <th className="px-5 py-4 font-semibold">Capability</th>
                  <th className="bg-[#2a3b12] px-5 py-4 font-semibold text-[#d8ff70]">
                    ResolveX
                  </th>
                  <th className="px-5 py-4 font-semibold text-white/70">
                    {competitor.name} & similar tools
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, ours, theirs]) => (
                  <tr key={feature} className="border-t border-black/8">
                    <td className="px-5 py-4 font-medium">{feature}</td>
                    <td className="bg-[#f4fbe6] px-5 py-4 text-[#2f5a0f]">
                      {ours}
                    </td>
                    <td className="px-5 py-4 text-[#6b6e75]">{theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="migration"
        className="bg-[#c5dcff] px-4 py-20 sm:px-6 md:py-28"
      >
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
          <div>
            <h2 className="text-balance text-4xl font-semibold tracking-[-.045em] md:text-5xl">
              Moving from {competitor.name}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#35506f]">
              {competitor.migration}
            </p>
          </div>
          <ol className="space-y-3">
            {[
              "Start the free trial and connect your website — Arlo learns your answers in minutes.",
              `Import contacts, history and articles from ${competitor.name}. Standard imports are included.`,
              "Pick your AI employees, connect the apps they may use, and set approvals.",
              "Install the messenger with one line and connect your phone number if you take calls.",
            ].map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-[12px] bg-white/80 p-5 text-[15px] leading-relaxed"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#111318] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-4xl font-semibold tracking-[-.045em]">
            Questions about switching
          </h2>
          <div className="mt-8 divide-y divide-black/8 rounded-[14px] border border-black/10">
            {faq.map(([question, answer]) => (
              <details key={question} className="group p-5">
                <summary className="cursor-pointer list-none text-[16px] font-semibold">
                  {question}
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b5e66]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-2xl font-semibold tracking-[-.03em]">
              Other {categoryLabels[competitor.category].toLowerCase()} compared
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/compare/${item.slug}`}
                  className="flex items-center justify-between rounded-[12px] border border-black/10 bg-white px-5 py-4 text-[15px] font-semibold hover:border-[#ff5c35]/50"
                >
                  ResolveX vs {item.name}
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
            <Link
              href="/compare"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5c35]"
            >
              See all comparisons <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      <section className="bg-[#ff5c35] px-4 py-20 text-center text-white sm:px-6 md:py-28">
        <h2 className="mx-auto max-w-3xl text-balance text-5xl font-semibold leading-[.95] tracking-[-.055em] md:text-6xl">
          Try ResolveX free for {pricing.trialDays} days.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
          Keep {competitor.name} running while you test. Switch when Arlo is
          answering the way you want.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-[6px] bg-white px-8 text-sm font-semibold text-[#151619]"
        >
          Start free trial <ArrowRight size={16} />
        </Link>
      </section>
      <MarketingFooter cta={false} />
      <ResolveWidget />
    </main>
  );
}
