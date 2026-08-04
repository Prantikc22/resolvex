import type { Metadata } from "next";
import { RecoveryPanel } from "@/components/auth/RecoveryPanel";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <RecoveryPanel mode="reset" />;
}
