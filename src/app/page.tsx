import type { Metadata } from "next";
import { MarketingV2 } from "@/components/marketing/MarketingV2";

export const metadata: Metadata = {
  title: "ResolveX - Customer support that finishes the work",
  description:
    "One customer support workspace for AI resolutions, human conversations, knowledge, workflows, and measurable service quality.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ResolveX - Customer support that finishes the work",
    description:
      "AI resolves the routine. Your team gets the conversations that deserve a human.",
    url: "/",
    type: "website",
    siteName: "ResolveX",
  },
};

export default function HomePage() {
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
