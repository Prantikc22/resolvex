import { NextResponse } from "next/server";
import {
  enqueueDueScheduledFlows,
  processEmployeeJobs,
} from "@/lib/jobs/runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportDodoUsage } from "@/lib/billing/dodo";
import { billingProvider } from "@/lib/billing/provider";

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
    // Metering runs alongside jobs but must never block them.
    const usage =
      billingProvider() === "dodo"
        ? await reportDodoUsage(admin).catch((error) => {
            console.error("Dodo usage reporting failed", error);
            return { reported: 0, error: "usage_report_failed" };
          })
        : null;
    return NextResponse.json({ scheduled, jobs, usage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worker failed." },
      { status: 500 },
    );
  }
}

export const GET = POST;
