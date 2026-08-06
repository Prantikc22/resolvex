import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ResolveX costs $15 per full agent each month and includes 50 AI resolutions with human handoff after the monthly allowance.",
};

export default function Page() {
  return <PricingPage />;
}
