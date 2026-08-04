import type { Metadata } from "next";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about ResolveX pricing, AI resolution, migration, data, billing, and support channels.",
};

const faqs = [
  [
    "Can I try ResolveX without a sales call?",
    "Yes. The trial lasts 14 days and does not require a card. Create a workspace, add approved knowledge, and use the product demo before deciding.",
  ],
  [
    "What does Arlo answer from?",
    "Arlo is instructed to use only knowledge approved inside the selected workspace. When the answer is uncertain or account-specific, the conversation should move to a person.",
  ],
  [
    "What counts as an AI resolution?",
    "A conversation counts when Arlo completes the answer without a human takeover. Drafts, clarifying questions, and human handoffs are not described as completed AI resolutions.",
  ],
  [
    "Can I import an existing help center?",
    "Website ingestion and PDF upload are available. Production imports should be reviewed before publishing because source pages and documents can contain stale instructions.",
  ],
  [
    "Do free collaborators count as paid agents?",
    "No. The paid seat is intended for a full support agent. Collaborators who only review or contribute context are not billed as full agents under the published One plan.",
  ],
  [
    "Can I cancel without contacting sales?",
    "The public cancellation and refund policy describes the process. The production billing portal becomes active when live Razorpay subscriptions are configured.",
  ],
  [
    "Does voice work everywhere?",
    "Voice requires a connected provider, an available number, and country-specific consent configuration. Availability and carrier charges depend on that provider.",
  ],
  [
    "How do you protect tenant data?",
    "The core schema uses organisation membership and row-level security. Public messenger access must use tenant-issued keys and server-side validation before production rollout.",
  ],
  [
    "Can ResolveX replace Intercom or Freshdesk?",
    "ResolveX is designed to cover the core inbox, knowledge, AI resolution, automation, reporting, and messenger workflow. Provider-dependent channels and migration scope should be verified for your exact setup.",
  ],
  [
    "Who builds ResolveX?",
    "ResolveX is a product built and operated by ResoluteX. Product pricing and roadmap are separate; ResoluteX is accountable for engineering and product stewardship.",
  ],
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-16 pt-40 sm:px-6 md:pt-48">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            FAQ
          </div>
          <h1 className="mt-6 max-w-4xl text-balance text-6xl font-semibold leading-[.9] md:text-8xl">
            The questions buyers should ask before they switch.
          </h1>
        </div>
      </section>
      <section className="px-4 pb-28 sm:px-6">
        <div className="mx-auto grid max-w-[1180px] gap-x-12 lg:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group border-b border-black/12">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-lg font-semibold">
                <span>{question}</span>
                <span className="text-2xl font-light text-[#ff5c35] group-open:rotate-45 transition">
                  +
                </span>
              </summary>
              <p className="max-w-xl pb-7 text-sm leading-relaxed text-[#666b74]">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
