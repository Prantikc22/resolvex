import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatbotTestBench } from "@/components/dev/ChatbotTestBench";

export const metadata: Metadata = {
  title: "Local chatbot test bench",
  robots: { index: false, follow: false },
};

export default function LocalChatbotDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChatbotTestBench />;
}
