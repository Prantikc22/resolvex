import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePage } from "@/components/marketing/ComparePage";

const allowed = ["intercom", "freshdesk"] as const;

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params;
  const name = competitor === "intercom" ? "Intercom" : competitor === "freshdesk" ? "Freshdesk" : "Helpdesk";
  return { title: `ResolveX vs ${name}`, description: `Compare ResolveX with ${name}: pricing model, AI resolutions, help center, messenger, voice, and migration.` };
}

export default async function Page({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  if (!allowed.includes(competitor as typeof allowed[number])) notFound();
  return <ComparePage competitor={competitor as typeof allowed[number]}/>;
}
