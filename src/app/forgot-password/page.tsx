import type { Metadata } from "next";
import { RecoveryPanel } from "@/components/auth/RecoveryPanel";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <RecoveryPanel mode="request" />;
}
