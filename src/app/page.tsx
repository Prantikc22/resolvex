import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublishedHelpCenter } from "@/components/help/PublishedHelpCenter";
import { MarketingV2 } from "@/components/marketing/MarketingV2";
import { getPublishedHelpCenterForHost } from "@/lib/help-center/domain";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ResolveX - AI employees for customer support and sales",
  description:
    "AI employees that answer every customer and follow up every lead across chat, email and phone — with your team in control. From $15 per seat.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ResolveX - AI employees for customer support and sales",
    description:
      "Answer enquiries, capture leads and resolve requests across every connected channel.",
    url: "/",
    type: "website",
    siteName: "ResolveX",
  },
};

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  const customHelpCenter = await getPublishedHelpCenterForHost(host);
  if (customHelpCenter) {
    const admin = createAdminClient();
    const { data: articles } = await admin
      .from("knowledge_articles")
      .select("id,title,body,source_url,updated_at")
      .eq("organization_id", customHelpCenter.organization_id)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(100);
    return (
      <PublishedHelpCenter
        helpCenter={customHelpCenter}
        articles={articles ?? []}
      />
    );
  }
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ResolveX",
      url: "https://www.getresolvex.com",
      logo: "https://www.getresolvex.com/icon.svg",
      description:
        "AI customer support software for grounded resolutions, human conversations, knowledge, workflows, and voice.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ResolveX",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.getresolvex.com",
      description:
        "An AI helpdesk that answers from approved knowledge, completes safe work, and hands complex customer moments to people.",
      offers: {
        "@type": "Offer",
        price: "15",
        priceCurrency: "USD",
        description: "Per full agent per month; usage charges may apply.",
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MarketingV2 />
    </>
  );
}
