import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  supportEmail: z.string().email(),
  retention: z.enum(["6 months", "12 months", "18 months", "Indefinite"]),
});

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("organizations")
    .select("name,support_email,settings")
    .eq("id", organizationId)
    .single();
  if (error)
    return NextResponse.json(
      { error: "Could not load workspace settings." },
      { status: 500 },
    );
  return NextResponse.json({
    name: data.name,
    supportEmail: data.support_email ?? user.email ?? "",
    retention: data.settings?.retention ?? "18 months",
  });
}

export async function PATCH(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
    return NextResponse.json(
      { error: "Only owners and admins can change workspace settings." },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Check the workspace name, support email, and retention period.",
      },
      { status: 400 },
    );
  const { data: organization } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      support_email: parsed.data.supportEmail,
      settings: {
        ...(organization?.settings ?? {}),
        retention: parsed.data.retention,
      },
    })
    .eq("id", organizationId);
  if (error)
    return NextResponse.json(
      { error: "Could not save workspace settings." },
      { status: 500 },
    );
  return NextResponse.json({ saved: true });
}
