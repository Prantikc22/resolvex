import type { Metadata } from "next";
import { PaddlePaymentLink } from "@/components/billing/PaddlePaymentLink";

export const metadata: Metadata = {
  title: "Secure checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <PaddlePaymentLink />;
}
