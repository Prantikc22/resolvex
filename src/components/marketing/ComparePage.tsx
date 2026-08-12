import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

const competitors = {
  intercom: {
    name: "Intercom",
    headline: "A calmer Intercom alternative with a bill you can model.",
    copy: "ResolveX combines the inbox, AI resolution, help center, workflows, and voice handoff in one readable plan. Use your current invoice for an exact comparison.",
  },
  freshdesk: {
    name: "Freshdesk",
    headline: "Freshdesk capability without the tier-by-tier assembly.",
    copy: "ResolveX is built for teams that want the complete support operation from day one, with one paid-agent rate and transparent AI usage pricing.",
  },
};

export function ComparePage({
  competitor,
}: {
  competitor: keyof typeof competitors;
}) {
  const data = competitors[competitor];
  const rows = [
    ["Published full-agent price", "$15 / month", "Varies by plan"],
    [
      "AI allowance",
      "50 included · then $0.39 each",
      "Varies by AI product and plan",
    ],
    ["Collaborators", "Unlimited and free", "Plan dependent"],
    ["Messenger", "Included", "Included or plan dependent"],
    ["Help center", "Included", "Plan dependent"],
    [
      "Website and PDF learning",
      "Included with clear limits",
      "Plan dependent",
    ],
    ["Voice from conversation", "Usage based", "Plan and telephony dependent"],
    ["Standard migration", "Included", "Scope dependent"],
  ];
  return (
    <main className="bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-24 pt-40 sm:px-6 md:pb-32 md:pt-48">
        <div className="mx-auto max-w-[1200px] text-center">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            ResolveX vs {data.name}
          </div>
          <h1 className="mx-auto mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">
            {data.headline}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[#666970]">
            {data.copy}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="flex h-14 items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] px-6 text-sm font-semibold text-white"
            >
              Start free <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing#calculator"
              className="flex h-14 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white px-6 text-sm font-semibold"
            >
              Run your bill <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-[1050px]">
          <div className="grid grid-cols-[1.1fr_.85fr_.85fr] bg-[#111214] px-4 py-5 text-xs font-semibold text-white sm:px-6 sm:text-sm">
            <span>Capability</span>
            <span className="text-[#d8ff70]">ResolveX</span>
            <span className="text-white/45">{data.name}</span>
          </div>
          {rows.map(([label, ours, theirs]) => (
            <div
              key={label}
              className="grid grid-cols-[1.1fr_.85fr_.85fr] border-x border-b border-black/10 px-4 py-5 text-[11px] sm:px-6 sm:text-sm"
            >
              <span className="font-semibold">{label}</span>
              <span className="flex items-start gap-1.5 text-[#477d20]">
                <Check size={14} className="mt-0.5 shrink-0" />
                {ours}
              </span>
              <span className="flex items-start gap-1.5 text-[#777a82]">
                <Minus size={14} className="mt-0.5 shrink-0" />
                {theirs}
              </span>
            </div>
          ))}
          <p className="mt-5 text-xs leading-relaxed text-[#85878d]">
            Competitor pricing and packaging change frequently. This page avoids
            presenting a guessed competitor total. Enter the amount from your
            current invoice in our calculator for a truthful savings estimate.
          </p>
        </div>
      </section>
      <section id="migration" className="bg-[#c5dcff] px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.14em] text-[#315d91]">
              Switch without a blackout
            </div>
            <h2 className="mt-5 text-5xl font-semibold leading-[.95] tracking-[-.05em] md:text-6xl">
              Bring history.
              <br />
              <span className="font-display font-normal italic">
                Leave the bill.
              </span>
            </h2>
          </div>
          <div className="space-y-6">
            {[
              [
                "01",
                "Import",
                "Contacts, conversations, tags, and help articles.",
              ],
              [
                "02",
                "Run together",
                "Connect one channel and validate routing before the full move.",
              ],
              [
                "03",
                "Switch the widget",
                "Replace one script tag. Your team keeps working.",
              ],
              [
                "04",
                "Measure",
                "Compare response, resolution, and cost in the first 30 days.",
              ],
            ].map(([number, title, copy]) => (
              <div
                key={number}
                className="grid grid-cols-[40px_1fr] gap-3 border-b border-[#315d91]/15 pb-5"
              >
                <span className="font-mono text-xs text-[#315d91]">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[#546b84]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#ff5c35] px-4 py-24 text-center text-white">
        <h2 className="text-6xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">
          Compare by using it.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-white/70">
          No deck required. Open the complete workspace or start with your own
          inbox.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/demo"
            className="flex h-14 items-center justify-center rounded-[6px] bg-white px-6 text-sm font-semibold text-[#151619]"
          >
            Open live demo
          </Link>
          <Link
            href="/signup"
            className="flex h-14 items-center justify-center rounded-[6px] border border-white/35 px-6 text-sm font-semibold"
          >
            Start free
          </Link>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
