import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/legal/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "ResolveX - Customer support that finishes the work",
    template: "%s | ResolveX",
  },
  description:
    "One customer support workspace for AI resolutions, human conversations, knowledge, workflows, and measurable service quality.",
  creator: "ResoluteX",
  publisher: "ResoluteX",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "ResolveX - Customer support that finishes the work",
    description:
      "AI resolves the routine. Your team gets the conversations that deserve a human.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f6f7f9] text-[#101114] selection:bg-[#c8ff73] selection:text-[#101114]">
        {children}
        <CookieConsent />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
