import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/Workspace";

export const metadata: Metadata = { title: "Interactive product demo" };

export default function DemoPage() {
  return <Workspace demo />;
}
