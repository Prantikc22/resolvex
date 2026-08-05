import { createClient } from "@/lib/supabase/server";

export async function getCurrentOrganization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      supabase,
      user: null,
      organizationId: null,
      membershipRole: null,
    };
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return {
    supabase,
    user,
    organizationId: membership?.organization_id ?? null,
    membershipRole: membership?.role ?? null,
  };
}
