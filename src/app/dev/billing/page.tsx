import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriptionBillingView } from "@/components/workspace/SubscriptionBillingView";

export const metadata: Metadata = {
  title: "Local billing preview",
  robots: { index: false, follow: false },
};

export default function LocalBillingPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="workspace-ui flex h-screen overflow-hidden">
      <div className="workspace-main flex min-w-0 flex-1 flex-col">
        <SubscriptionBillingView billingConfigured />
      </div>
    </main>
  );
}
