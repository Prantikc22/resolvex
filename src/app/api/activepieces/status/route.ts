import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function GET() {
  const { user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const url = process.env.ACTIVEPIECES_URL?.replace(/\/$/, "") ?? null;
  return NextResponse.json({
    configured: Boolean(url && process.env.ACTIVEPIECES_EMBED_SIGNING_KEY),
    url: url ? `${url}/flows` : null,
    mode: "external_builder",
  });
}
