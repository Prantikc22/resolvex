import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { blogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "AI Customer Support Guides & Helpdesk Insights",
  description:
    "Practical guides to AI customer support, helpdesk automation, support costs, knowledge management, and safe human handoffs.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "ResolveX Field Notes — AI Customer Support Guides",
    description:
      "Sourceable, practical answers for modern customer support teams.",
    url: "/blog",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-20 pt-40 sm:px-6 md:pb-28 md:pt-48">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            ResolveX field notes
          </div>
          <h1 className="mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">
            Better answers for
            <br />
            <span className="font-display font-normal italic text-[#777a80]">
              better support.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#666970]">
            Clear guides to AI customer service, helpdesk economics, knowledge
            quality, safe automation, and human handoffs—without the vague
            transformation language.
          </p>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 md:pb-32">
        <div className="mx-auto grid max-w-[1240px] gap-4 lg:grid-cols-3">
          {blogPosts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`group flex min-h-[440px] flex-col rounded-[9px] border border-black/10 p-6 transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(26,30,38,.13)] sm:p-8 ${
                index === 0
                  ? "bg-[#111318] text-white"
                  : index === 1
                    ? "bg-[#c5dcff]"
                    : "bg-[#fff7cf]"
              }`}
            >
              <div
                className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] ${
                  index === 0 ? "text-[#d8ff70]" : "text-black/45"
                }`}
              >
                <span>{post.category}</span>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={12} /> {post.readTime}
                </span>
              </div>
              <div className="mt-auto">
                <h2 className="text-balance text-3xl font-semibold leading-[1.02] tracking-[-.04em]">
                  {post.title}
                </h2>
                <p
                  className={`mt-4 text-sm leading-relaxed ${
                    index === 0 ? "text-white/54" : "text-black/56"
                  }`}
                >
                  {post.description}
                </p>
                <span className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em]">
                  Read guide
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
