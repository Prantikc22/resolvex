import { NextResponse } from "next/server";
import { z } from "zod";
import { askArlo } from "@/lib/ai/arlo";
import { clientAddress, consumeUsageGuard } from "@/lib/billing/guards";
import { usageGuards } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

const context =
  "ResolveX provides a shared inbox, Arlo AI resolutions, a help center, website chat, approved knowledge ingestion, workflows, reports, and provider-connected voice handoff. The One plan is $15 per full agent each month and includes 50 AI resolutions. Additional completed AI resolutions are $0.39 each; drafts and human handoffs are not billed. Human collaborators are free. The trial lasts 7 days, includes Arlo text replies, and Dodo Payments securely authorises a payment method at checkout. AI voice and phone calls on the customer's own number use prepaid minute packs (100 minutes $22, 500 minutes $99, 2,000 minutes $380) on a paid plan. Annual billing is $144 per seat per year (two months free).";

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const admin = createAdminClient();
    const [visitorAllowed, dailyAllowed] = await Promise.all([
      consumeUsageGuard(
        admin,
        `public-assistant:${clientAddress(request)}`,
        usageGuards.publicAssistantPerVisitor,
        600,
      ),
      consumeUsageGuard(
        admin,
        "public-assistant:all",
        usageGuards.publicAssistantPerDay,
        86_400,
      ),
    ]);
    if (!visitorAllowed || !dailyAllowed)
      return NextResponse.json(
        {
          message:
            "I’m getting a lot of questions right now. Leave your email with the team or try again in a few minutes.",
          source: "Rate limited",
        },
        { status: 429 },
      );
    const result = await askArlo({
      workspace: "ResolveX",
      context,
      messages: input.messages,
    });
    return NextResponse.json({
      message: result.message,
      source: "ResolveX approved product guide",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      {
        message:
          "I could not complete that answer. I can still keep your question ready for a person.",
        source: "Human handoff available",
        detail,
      },
      { status: 200 },
    );
  }
}
