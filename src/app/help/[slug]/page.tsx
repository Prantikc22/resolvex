import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";
import { getHelpArticle, getHelpCategory, helpArticles } from "@/lib/help-content";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = getHelpArticle((await params).slug);
  if (!article) return {};
  return { title: `${article.title} | ResolveX Help`, description: article.summary };
}

export default async function HelpArticlePage({ params }: ArticlePageProps) {
  const article = getHelpArticle((await params).slug);
  if (!article) notFound();
  const category = getHelpCategory(article.category);
  const related = helpArticles.filter((item) => item.category === article.category && item.slug !== article.slug).slice(0, 2);

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <article className="px-4 pb-24 pt-32 sm:px-6 md:pt-40">
        <div className="mx-auto max-w-[1120px]">
          <Link href={`/help#${article.category}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#676a71] transition hover:text-black"><ArrowLeft size={14} /> Help center</Link>
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">{category?.title}</div>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.96] tracking-[-.055em] sm:text-6xl md:text-7xl">{article.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#676a71]">{article.summary}</p>
              <div className="mt-6 flex items-center gap-2 text-xs text-[#777a81]"><Clock3 size={14} /> {article.readTime} read</div>

              <div className="mt-14 space-y-12 border-t border-black/12 pt-12">
                {article.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-semibold tracking-[-.03em]">{section.heading}</h2>
                    <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#555960]">
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                    {section.steps && (
                      <ol className="mt-6 space-y-3">
                        {section.steps.map((step, index) => (
                          <li key={step} className="grid grid-cols-[32px_1fr] gap-3 border-t border-black/8 pt-3 text-sm leading-6 text-[#4f535a]"><span className="font-mono text-[#ff5c35]">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>
                        ))}
                      </ol>
                    )}
                  </section>
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[7px] border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(25,30,42,.07)]">
                <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#878a91]">Related answers</div>
                <div className="mt-3 divide-y divide-black/8">
                  {related.map((item) => <Link key={item.slug} href={`/help/${item.slug}`} className="group flex items-start justify-between gap-3 py-4 text-sm font-semibold leading-snug hover:text-[#ff5c35]"><span>{item.title}</span><ArrowRight size={14} className="mt-0.5 shrink-0 transition group-hover:translate-x-1" /></Link>)}
                </div>
              </div>
              <div className="mt-3 rounded-[7px] bg-[#151619] p-5 text-white">
                <div className="text-sm font-semibold">Still need a person?</div>
                <p className="mt-2 text-xs leading-relaxed text-white/55">Open the messenger and the conversation will keep this page as context.</p>
                <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#d8ff70]">Contact ResolveX <ArrowRight size={14} /></Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}

