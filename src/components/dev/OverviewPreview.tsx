"use client";

import { OverviewDashboard } from "@/components/workspace/ResolveXModules";
import { cn } from "@/lib/utils";

/** Renders the workspace overview outside auth so layout can be checked locally. */
export function OverviewPreview({ dark }: { dark: boolean }) {
  return (
    <main
      className={cn(
        "workspace-ui flex h-screen overflow-hidden bg-[#0b0d12]",
        dark && "workspace-dark",
      )}
    >
      <div className="workspace-main flex min-w-0 flex-1 flex-col">
        <OverviewDashboard onNavigate={() => undefined} />
      </div>
    </main>
  );
}
