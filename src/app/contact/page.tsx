import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ResolveWidget } from "@/components/widget/ResolveWidget";

export const metadata: Metadata = { title: "Contact" };

const locations = [
  [
    "Kolkata",
    "Globsyn Crystal Tower I",
    "XI-11 & 12, Block-EP, Sector V, Salt Lake City, Kolkata 700091, India",
  ],
  [
    "Bengaluru",
    "Brigade IRV Centre",
    "Nallurhalli Road, Whitefield, Bengaluru 560066, India",
  ],
  [
    "London",
    "ResoluteX UK",
    "182-184 High St N, London E6 2JA, United Kingdom",
  ],
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ef]">
      <Header />
      <section className="px-4 pb-24 pt-40 sm:px-6 md:pb-32 md:pt-48">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            Contact ResolveX
          </div>
          <h1 className="mt-6 max-w-4xl text-balance text-6xl font-semibold leading-[.92] tracking-[-.06em] md:text-8xl">
            A direct route to the people behind support.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#666970]">
            Product help, billing questions, security reviews, and enterprise
            requirements reach the right team without a qualification maze.
          </p>
          <div className="mt-14 grid border-l border-t border-black/10 md:grid-cols-3">
            {[
              [Mail, "Product and account", "support@resolutexhq.com"],
              [Mail, "Billing", "billing@resolutexhq.com"],
              [MessageCircle, "In-product help", "Open the ResolveX messenger"],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof Mail;
              return (
                <div
                  key={label as string}
                  className="border-b border-r border-black/10 bg-white p-7"
                >
                  <I size={20} />
                  <div className="mt-8 text-xs font-bold uppercase tracking-[.1em] text-[#858992]">
                    {label as string}
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {value as string}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#ff5c35]">
            <MapPin size={14} />
            ResoluteX offices
          </div>
          <div className="mt-8 grid border-l border-t border-black/10 lg:grid-cols-3">
            {locations.map(([city, building, address]) => (
              <address
                key={city}
                className="border-b border-r border-black/10 p-7 not-italic"
              >
                <div className="text-2xl font-semibold">{city}</div>
                <div className="mt-5 text-sm font-semibold">{building}</div>
                <p className="mt-1 text-sm leading-relaxed text-[#666970]">
                  {address}
                </p>
              </address>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
      <ResolveWidget />
    </main>
  );
}
