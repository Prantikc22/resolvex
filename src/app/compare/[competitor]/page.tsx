import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePage, compareFaq } from "@/components/marketing/ComparePage";
import { competitors, getCompetitor } from "@/lib/competitors";

export const dynamicParams = false;

export function generateStaticParams() {
  return competitors.map((item) => ({ competitor: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const competitor = getCompetitor((await params).competitor);
  if (!competitor) return {};
  const title = `ResolveX vs ${competitor.name}: the best ${competitor.name} alternative (2026)`;
  const description = `Compare ResolveX and ${competitor.name}: pricing model, AI employees, voice, help center, CRM and migration. $15 per seat, 50 AI resolutions included.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compare/${competitor.slug}` },
    openGraph: {
      title,
      description,
      url: `/compare/${competitor.slug}`,
      type: "article",
      siteName: "ResolveX",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const competitor = getCompetitor((await params).competitor);
  if (!competitor) notFound();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: compareFaq(competitor).map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Compare",
          item: "https://www.getresolvex.com/compare",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: `ResolveX vs ${competitor.name}`,
          item: `https://www.getresolvex.com/compare/${competitor.slug}`,
        },
      ],
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
      <ComparePage competitor={competitor} />
    </>
  );
}
