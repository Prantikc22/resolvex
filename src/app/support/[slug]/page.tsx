import type { Metadata } from "next";
import { BookOpen, Search } from "lucide-react";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { createAdminClient } from "@/lib/supabase/admin";

async function center(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("help_centers")
    .select("name,slug,accent,is_published,organization_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: PageProps<"/support/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const helpCenter = await center(slug);
  return helpCenter
    ? {
        title: helpCenter.name,
        description: `Approved support knowledge from ${helpCenter.name}.`,
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
  const admin = createAdminClient();
  const { data: articles } = await admin
    .from("knowledge_articles")
    .select("id,title,body,source_url,updated_at")
    .eq("organization_id", helpCenter.organization_id)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#17191d]">
      <header className="border-b border-black/8 bg-white px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo />
          <span className="text-xs text-[#858891]">{helpCenter.name}</span>
        </div>
      </header>
      <section
        className="px-5 py-20 text-center"
        style={{ background: `${helpCenter.accent}12` }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[.14em]"
          style={{ color: helpCenter.accent }}
        >
          Support center
        </p>
        <h1 className="mt-4 font-display text-5xl md:text-7xl">
          How can we help?
        </h1>
        <div className="mx-auto mt-8 flex h-13 max-w-xl items-center gap-3 rounded-[8px] border border-black/10 bg-white px-4 text-sm text-[#8a8d94] shadow-sm">
          <Search size={17} />
          Browse approved answers below
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-2 lg:grid-cols-3">
        {(articles ?? []).map((article) => (
          <article
            key={article.id}
            className="rounded-[9px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(20,25,35,.04)]"
          >
            <span
              className="grid size-9 place-items-center rounded-[6px]"
              style={{
                background: `${helpCenter.accent}18`,
                color: helpCenter.accent,
              }}
            >
              <BookOpen size={15} />
            </span>
            <h2 className="mt-7 text-lg font-semibold">{article.title}</h2>
            <p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-[#6f737c]">
              {article.body}
            </p>
            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-xs font-semibold"
                style={{ color: helpCenter.accent }}
              >
                Read original source →
              </a>
            )}
          </article>
        ))}
        {!articles?.length && (
          <div className="col-span-full rounded-[9px] border border-dashed border-black/15 p-12 text-center text-sm text-[#7a7d84]">
            No approved articles have been published yet.
          </div>
        )}
      </section>
    </main>
  );
}
