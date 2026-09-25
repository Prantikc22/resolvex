import {
  Database,
  Eye,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ResourcePage } from "@/components/marketing/ResourcePage";

const controls = [
  [
    LockKeyhole,
    "Tenant isolation",
    "Row-level policies scope customer, conversation, knowledge, and billing data to the active organization.",
  ],
  [
    KeyRound,
    "Server-side secrets",
    "Provider and service credentials stay in server environments and are never shipped to the browser.",
  ],
  [
    Eye,
    "Visible AI decisions",
    "Confidence, citations, actions, and handoffs remain inspectable instead of disappearing behind automation.",
  ],
  [
    Database,
    "Retention controls",
    "Workspaces choose retention periods and keep exportable conversation and usage records.",
  ],
  [
    Users,
    "Role boundaries",
    "Owners, admins, agents, and collaborators receive distinct product and billing permissions.",
  ],
  [
    ShieldCheck,
    "Human approval",
    "Sensitive account actions and low-confidence answers can require a person before anything reaches the customer.",
  ],
];

export default function SecurityPage() {
  return (
    <ResourcePage
      eyebrow="Security"
      title="Fast support without invisible risk."
      copy="ResolveX is designed so teams can inspect who answered, what source was used, and which action happened. Enterprise controls can be added by agreement where your environment requires them."
    >
      <section className="bg-[#111214] px-4 py-20 text-white sm:px-6">
        <div className="mx-auto grid max-w-[1180px] gap-px overflow-hidden rounded-[8px] bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map(([Icon, title, copy]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <article key={title as string} className="bg-[#111214] p-7">
                <I size={21} className="text-[#d8ff70]" />
                <h2 className="mt-5 text-xl font-semibold">
                  {title as string}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/48">
                  {copy as string}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </ResourcePage>
  );
}
