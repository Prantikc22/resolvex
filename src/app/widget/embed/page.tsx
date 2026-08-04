import type { Metadata } from "next";
import { WidgetPanel } from "@/components/widget/ResolveWidget";

export const metadata: Metadata = {
  title: "ResolveX Messenger",
  robots: { index: false, follow: false },
};

export default async function WidgetEmbedPage({
  searchParams,
}: PageProps<"/widget/embed">) {
  const { workspace } = await searchParams;
  return (
    <main className="h-screen overflow-hidden bg-transparent">
      <WidgetPanel
        embedded
        workspaceKey={typeof workspace === "string" ? workspace : undefined}
      />
    </main>
  );
}
