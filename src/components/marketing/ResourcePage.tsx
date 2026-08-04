import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export function ResourcePage({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#151619]">
      <Header />
      <section className="px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-5xl text-balance text-6xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">
            {title}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#666970]">
            {copy}
          </p>
        </div>
      </section>
      {children}
      <section className="bg-[#ff5c35] px-4 py-20 text-center text-white sm:px-6">
        <CheckCircle2 className="mx-auto" />
        <h2 className="mt-5 text-5xl font-semibold tracking-[-.05em] md:text-7xl">
          Ready when your customers are.
        </h2>
        <Link
          href="/signup"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-[6px] bg-white px-7 text-sm font-semibold text-[#151619]"
        >
          Start free <ArrowRight size={16} />
        </Link>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
