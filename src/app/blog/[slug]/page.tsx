import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { blogPosts, getBlogPost } from "@/lib/blog";

const siteUrl = "https://www.getresolvex.com";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: "ResolveX Editorial Team" }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["ResolveX Editorial Team"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
      author: { "@type": "Organization", name: "ResolveX" },
      publisher: {
        "@type": "Organization",
        name: "ResolveX",
        url: siteUrl,
      },
      keywords: post.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <article>
        <header className="px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
          <div className="mx-auto max-w-[1040px]">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#666970]"
            >
              <ArrowLeft size={14} /> All field notes
            </Link>
            <div className="mt-10 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[.12em] text-[#ff5c35]">
              <span>{post.category}</span>
              <span className="h-3 w-px bg-black/15" />
              <span className="flex items-center gap-1.5 text-[#74777e]">
                <Clock3 size={12} /> {post.readTime}
              </span>
              <time dateTime={post.publishedAt} className="text-[#74777e]">
                August 5, 2026
              </time>
            </div>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[.94] tracking-[-.055em] sm:text-6xl md:text-8xl">
              {post.title}
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-relaxed text-[#62656c]">
              {post.description}
            </p>
          </div>
        </header>

        <div className="border-y border-black/10 bg-white px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto grid max-w-[1040px] gap-12 lg:grid-cols-[220px_1fr]">
            <aside className="h-fit lg:sticky lg:top-32">
              <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#8a8d93]">
                In this guide
              </div>
              <nav className="mt-5 space-y-3 border-l border-black/10 pl-4">
                {post.sections.map((section) => (
                  <a
                    key={section.heading}
                    href={`#${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="block text-xs leading-relaxed text-[#666970] hover:text-black"
                  >
                    {section.heading}
                  </a>
                ))}
                <a
                  href="#frequently-asked-questions"
                  className="block text-xs leading-relaxed text-[#666970] hover:text-black"
                >
                  Frequently asked questions
                </a>
              </nav>
            </aside>

            <div className="min-w-0">
              {post.sections.map((section, index) => (
                <section
                  key={section.heading}
                  id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                  className="scroll-mt-32 border-b border-black/10 pb-12 pt-12 first:pt-0"
                >
                  <div className="font-mono text-[10px] text-[#ff5c35]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.05] tracking-[-.035em] md:text-4xl">
                    {section.heading}
                  </h2>
                  <div className="mt-6 space-y-5 text-base leading-8 text-[#53565d]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets && (
                    <ul className="mt-7 grid gap-3">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-3 rounded-[6px] bg-[#f5f4ef] p-4 text-sm leading-relaxed text-[#44474d]"
                        >
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#d8ff70]">
                            <Check size={12} />
                          </span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              <section
                id="frequently-asked-questions"
                className="scroll-mt-32 pt-14"
              >
                <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#ff5c35]">
                  Quick answers
                </div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-.04em]">
                  Frequently asked questions
                </h2>
                <div className="mt-8 space-y-2">
                  {post.faq.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-[7px] border border-black/10 bg-[#f5f4ef] p-5 open:bg-[#fff7cf]"
                    >
                      <summary className="cursor-pointer list-none pr-8 text-base font-semibold marker:hidden">
                        {item.question}
                      </summary>
                      <p className="mt-4 text-sm leading-7 text-[#595c63]">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </article>

      <section className="bg-[#ff5c35] px-4 py-20 text-center text-white sm:px-6">
        <h2 className="mx-auto max-w-4xl text-balance text-5xl font-semibold leading-[.94] tracking-[-.05em] md:text-7xl">
          Put the guide into practice.
        </h2>
        <Link
          href="/signup"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-[6px] bg-white px-7 text-sm font-semibold text-[#151619]"
        >
          Start 7 days free <ArrowRight size={16} />
        </Link>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
