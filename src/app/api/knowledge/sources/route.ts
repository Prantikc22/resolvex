import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const idSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  }
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select(
      "id,kind,name,source_url,status,page_count,byte_size,last_synced_at,created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sources: data ?? [] });
}

export async function PATCH(request: Request) {
  try {
    const input = idSchema.parse(await request.json());
    const { supabase, organizationId } = await getCurrentOrganization();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    }
    const { data, error } = await supabase
      .from("knowledge_sources")
      .update({ status: "ready" })
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select(
        "id,kind,name,source_url,status,page_count,byte_size,last_synced_at,created_at",
      )
      .single();
    if (error) throw error;
    const { error: articleError } = await supabase
      .from("knowledge_articles")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("source_id", input.id)
      .eq("organization_id", organizationId);
    if (articleError) throw articleError;
    return NextResponse.json({ source: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const input = idSchema.parse(await request.json());
    const { supabase, organizationId } = await getCurrentOrganization();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    }
    const { error } = await supabase
      .from("knowledge_sources")
      .delete()
      .eq("id", input.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 400 },
    );
  }
}
