"use client";

import { useState } from "react";
import { UsageView } from "@/components/workspace/ResolveXModules";
import { SubscriptionBillingView } from "@/components/workspace/SubscriptionBillingView";
import { cn } from "@/lib/utils";

/** Usage & billing: the plan, seats, voice minutes, and usage limits. */
export function BillingHubView({
  billingConfigured,
}: {
  billingConfigured: boolean;
}) {
  const [tab, setTab] = useState<"plan" | "usage">("plan");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-6 border-b border-black/10 bg-white px-4 pt-3 md:px-7">
        {(
          [
            ["plan", "Plan & billing"],
            ["usage", "Usage & limits"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors",
              tab === key
                ? "border-[#ff5c35] text-[#17191d]"
                : "border-transparent text-[#777b83] hover:text-[#17191d]",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "plan" ? (
        <SubscriptionBillingView billingConfigured={billingConfigured} />
      ) : (
        <UsageView />
      )}
    </div>
  );
}
