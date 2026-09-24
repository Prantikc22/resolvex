import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id,contact_id,ai_employee_id,phone_number_id,direction,handler_type,from_number,to_number,status,started_at,ended_at,duration_seconds,summary,transcript,recording_url,outcome,cost_minor,currency,created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ calls: data ?? [] });
}
