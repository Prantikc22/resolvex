import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace/Workspace";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { billingConfigured } from "@/lib/billing/provider";

export const metadata: Metadata = { title: "Workspace" };

export default async function AppPage() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user) redirect("/login");
  if (!organizationId) redirect("/onboarding");
  const [{ data: organization }, { data: profile }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name,support_email")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  return (
    <Workspace
      identity={{
        workspaceName: organization?.name ?? "Your workspace",
        supportEmail: organization?.support_email ?? "",
        userName:
          profile?.full_name ??
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "Workspace owner",
      }}
      capabilities={{
        billing: billingConfigured(),
      }}
    />
  );
}
