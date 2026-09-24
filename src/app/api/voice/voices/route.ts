import { NextResponse } from "next/server";
import { listElevenLabsVoices } from "@/lib/providers/elevenlabs";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export async function GET() {
  const { user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  if (!process.env.ELEVENLABS_API_KEY)
    return NextResponse.json({ voices: [], configured: false });
  try {
    return NextResponse.json({
      voices: await listElevenLabsVoices(),
      configured: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load voices.",
      },
      { status: 502 },
    );
  }
}
