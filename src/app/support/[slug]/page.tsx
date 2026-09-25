import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublishedHelpCenter } from "@/components/help/PublishedHelpCenter";
import { createAdminClient } from "@/lib/supabase/admin";

async function center(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("help_centers")
    .select("name,slug,accent,is_published,organization_id,custom_domain")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

async function articles(organizationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("knowledge_articles")
    .select("id,title,body,source_url,updated_at")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function generateMetadata({
  params,
}: PageProps<"/support/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const helpCenter = await center(slug);
  return helpCenter
    ? {
        title: helpCenter.name,
        description: "Approved support knowledge from " + helpCenter.name + ".",
        robots: { index: true, follow: true },
      }
    : {};
}

export default async function SupportPage({
  params,
}: PageProps<"/support/[slug]">) {
  const { slug } = await params;
  const helpCenter = await center(slug);
  if (!helpCenter) notFound();
  return (
    <PublishedHelpCenter
      helpCenter={helpCenter}
      articles={await articles(helpCenter.organization_id)}
    />
  );
}
