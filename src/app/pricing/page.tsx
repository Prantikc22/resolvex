import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ResolveX costs $15 per full agent each month, includes 50 AI resolutions, and charges $0.39 per additional completed AI resolution.",
};

export default function Page() {
  return <PricingPage />;
}
