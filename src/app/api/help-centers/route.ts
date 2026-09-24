import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(60),
  customDomain: z.string().max(255).optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#ff5c35"),
  published: z.boolean().default(false),
});

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("help_centers")
    .select("id,name,slug,custom_domain,accent,is_published")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ helpCenter: data });
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Create a workspace first." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only workspace managers can publish a help center." },
        { status: 403 },
      );
    const { data, error } = await supabase
      .from("help_centers")
      .upsert(
        {
          organization_id: organizationId,
          name: input.name,
          slug: input.slug,
          custom_domain: input.customDomain || null,
          accent: input.accent,
          is_published: input.published,
        },
        { onConflict: "organization_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ helpCenter: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save help center.",
      },
      { status: 400 },
    );
  }
}
