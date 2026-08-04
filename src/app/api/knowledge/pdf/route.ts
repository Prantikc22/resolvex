import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") return NextResponse.json({ error: "Choose a PDF file." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "PDFs are limited to 20 MB." }, { status: 413 });
    const { supabase, organizationId } = await getCurrentOrganization();
    if (!organizationId) return NextResponse.json({ error: "Create a workspace first." }, { status: 401 });
    const { count } = await supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("kind", "pdf");
    if ((count ?? 0) >= 25) return NextResponse.json({ error: "The One plan includes up to 25 PDFs." }, { status: 409 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    const content = extracted.text;
    const { data, error } = await supabase.from("knowledge_sources").insert({ organization_id: organizationId, kind: "pdf", name: file.name, status: "ready", content: content.slice(0, 500000), page_count: extracted.totalPages, byte_size: file.size, last_synced_at: new Date().toISOString(), metadata: { mime_type: file.type } }).select("id,name,status,page_count").single();
    if (error) throw error;
    return NextResponse.json({ source: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process PDF." }, { status: 400 });
  }
}
