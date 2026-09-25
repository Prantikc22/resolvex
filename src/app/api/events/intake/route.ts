import crypto from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { runEventAutomations } from "@/lib/automation/run";
import { processEmployeeJobs } from "@/lib/jobs/runner";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().trim().min(4).max(240),
  event: z.enum([
    "crm_lead_created",
    "new_contact",
    "email_received",
    "call_completed",
    "webhook",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function authorized(request: Request) {
  const expected = process.env.TOOL_GATEWAY_SECRET?.trim();
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || expected.length !== supplied.length)
    return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const admin = createAdminClient();
    const { data: organization } = await admin
      .from("organizations")
      .select("id")
      .eq("id", input.organizationId)
      .single();
    if (!organization)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    const jobs = await runEventAutomations({
      supabase: admin,
      organizationId: input.organizationId,
      event: input.event,
      eventId: input.eventId,
      payload: input.payload,
    });
    after(async () => {
      await processEmployeeJobs(createAdminClient(), { limit: 20 });
    });
    return NextResponse.json({ accepted: true, jobs }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Event rejected." },
      { status: 400 },
    );
  }
}
