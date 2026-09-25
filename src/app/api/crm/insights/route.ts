import { NextResponse } from "next/server";
import { z } from "zod";
import { askJev } from "@/lib/providers/jev";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { consumeUsageGuard } from "@/lib/billing/guards";
import { usageGuards } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contact"), id: z.string().uuid() }),
  z.object({ type: z.literal("deal"), id: z.string().uuid() }),
]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!new Set(["owner", "admin", "agent"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "A read-only member cannot refresh CRM decisions." },
        { status: 403 },
      );

    if (
      !(await consumeUsageGuard(
        createAdminClient(),
        `crm-insights:${organizationId}`,
        usageGuards.crmInsightsPerHour,
        3_600,
      ))
    )
      return NextResponse.json(
        {
          error:
            "CRM insights refresh up to 60 times an hour. Try again shortly.",
        },
        { status: 429 },
      );

    const table = input.type === "contact" ? "contacts" : "deals";
    const fields =
      input.type === "contact"
        ? "id,name,email,company,tags,lifecycle_stage,territory,custom_fields"
        : "id,title,stage,amount_minor,currency,probability,next_step,territory,insights";
    const { data: item, error } = await supabase
      .from(table)
      .select(fields)
      .eq("organization_id", organizationId)
      .eq("id", input.id)
      .single();
    if (error || !item) throw error ?? new Error("CRM record not found.");
    const activityColumn = input.type === "contact" ? "contact_id" : "deal_id";
    const { data: activities } = await supabase
      .from("activities")
      .select("activity_type,title,summary,occurred_at")
      .eq("organization_id", organizationId)
      .eq(activityColumn, input.id)
      .order("occurred_at", { ascending: false })
      .limit(20);

    const answers = await askJev({
      state: { record: item, recentActivities: activities ?? [] },
      questions:
        input.type === "contact"
          ? {
              fit: {
                type: "score",
                instructions:
                  "Score the strength of this contact as a sales lead using only the supplied CRM signals.",
                criteria: [
                  "No usable buying signal",
                  "Weak",
                  "Moderate",
                  "Strong",
                  "Very strong",
                ],
              },
              attention: {
                type: "noul",
                instructions:
                  "Should a seller review this contact today based only on the supplied evidence?",
              },
            }
          : {
              risk: {
                type: "choice",
                instructions:
                  "Choose the primary current deal posture from the supplied CRM evidence.",
                criteria: {
                  healthy: "Clear progress and a credible next action.",
                  watch: "Some uncertainty or missing evidence needs review.",
                  blocked: "A material blocker prevents progress.",
                  insufficient_data: "There is not enough evidence to judge.",
                },
              },
              attention: {
                type: "noul",
                instructions:
                  "Should a seller review this deal today based only on the supplied evidence?",
              },
            },
    });

    if (input.type === "contact") {
      const normalized = Math.max(
        0,
        Math.min(100, Math.round((Number(answers.fit?.score ?? 0) / 4) * 100)),
      );
      const { data, error: updateError } = await supabase
        .from("contacts")
        .update({ lead_score: normalized })
        .eq("organization_id", organizationId)
        .eq("id", input.id)
        .select("id,lead_score")
        .single();
      if (updateError) throw updateError;
      return NextResponse.json({
        item: data,
        decision: {
          score: normalized,
          confidence: answers.fit?.confidence ?? 0,
          needsAttention: answers.attention?.noul ?? 0,
        },
      });
    }
    const decision = {
      posture: answers.risk?.choice ?? "insufficient_data",
      confidence: Number(answers.risk?.confidence ?? 0),
      needs_attention: Number(answers.attention?.noul ?? 0),
      evaluated_at: new Date().toISOString(),
    };
    const { data, error: updateError } = await supabase
      .from("deals")
      .update({ insights: decision })
      .eq("organization_id", organizationId)
      .eq("id", input.id)
      .select("id,insights")
      .single();
    if (updateError) throw updateError;
    return NextResponse.json({ item: data, decision });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not refresh CRM decision.",
      },
      { status: 400 },
    );
  }
}
