import { NextResponse } from "next/server";
import {
  enqueueDueScheduledFlows,
  processEmployeeJobs,
} from "@/lib/jobs/runner";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const admin = createAdminClient();
    const scheduled = await enqueueDueScheduledFlows(admin);
    const jobs = await processEmployeeJobs(admin, { limit: 20 });
    return NextResponse.json({ scheduled, jobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worker failed." },
      { status: 500 },
    );
  }
}

export const GET = POST;
