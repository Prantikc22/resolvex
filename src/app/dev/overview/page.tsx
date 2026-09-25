import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OverviewPreview } from "@/components/dev/OverviewPreview";

export const metadata: Metadata = {
  title: "Local overview preview",
  robots: { index: false, follow: false },
};

export default async function LocalOverviewPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { theme } = await searchParams;
  return <OverviewPreview dark={theme === "dark"} />;
}
