import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f6f8]">
      <Header />
      <section className="page-grid px-4 pb-24 pt-36 sm:px-6 md:pb-32 md:pt-44">
        <article className="mx-auto max-w-4xl">
          <div className="text-xs font-semibold uppercase tracking-[.12em] text-[#ff5c35]">
            ResolveX legal · Updated {updated}
          </div>
          <h1 className="mt-5 text-balance text-5xl font-semibold leading-[.96] tracking-[-.05em] md:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#6b6f78]">
            ResolveX is a ResoluteX product. These terms apply to the ResolveX
            website, workspace, messenger, APIs, and related services.
          </p>
          <div className="mt-12 border-t border-black/10 pt-7 text-sm leading-7 text-[#5f6671] [&_a]:font-semibold [&_a]:text-[#355cff] [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#15181d] [&_li]:max-w-3xl [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:max-w-3xl [&_ul]:ml-5 [&_ul]:list-disc">
            {children}
          </div>
        </article>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
