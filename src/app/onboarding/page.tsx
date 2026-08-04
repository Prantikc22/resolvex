import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function OnboardingPage() {
  const { user, organizationId } = await getCurrentOrganization();
  if (!user) redirect("/signup");
  if (organizationId) redirect("/app");
  return <OnboardingFlow />;
}
