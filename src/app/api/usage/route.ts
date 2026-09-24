import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const limitSchema = z.object({
  monthlyLimitMinor: z.number().int().min(0).max(100_000_000),
  voiceCallLimitSeconds: z.number().int().min(30).max(14400),
  alertAtPercent: z.number().int().min(1).max(100),
  hardStop: z.boolean(),
});

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: transactions }, { data: limit }] = await Promise.all([
    supabase
      .from("credit_transactions")
      .select(
        "id,category,amount_microunits,monetary_amount_minor,currency,reference_type,reference_id,created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("spending_limits")
      .select(
        "monthly_limit_minor,voice_call_limit_seconds,alert_at_percent,hard_stop",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  const rows = transactions ?? [];
  const balanceMicrounits = rows.reduce(
    (total, item) => total + Number(item.amount_microunits ?? 0),
    0,
  );
  const monthSpendMinor = rows
    .filter((item) => new Date(item.created_at) >= monthStart)
    .reduce(
      (total, item) =>
        total + Math.max(0, Number(item.monetary_amount_minor ?? 0)),
      0,
    );
  return NextResponse.json({
    transactions: rows,
    balanceMicrounits,
    monthSpendMinor,
    limits: limit ?? {
      monthly_limit_minor: 5000,
      voice_call_limit_seconds: 900,
      alert_at_percent: 80,
      hard_stop: true,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const input = limitSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only owners and admins can change limits." },
        { status: 403 },
      );
    const { data, error } = await supabase
      .from("spending_limits")
      .upsert({
        organization_id: organizationId,
        monthly_limit_minor: input.monthlyLimitMinor,
        voice_call_limit_seconds: input.voiceCallLimitSeconds,
        alert_at_percent: input.alertAtPercent,
        hard_stop: input.hardStop,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ limits: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save limits.",
      },
      { status: 400 },
    );
  }
}
