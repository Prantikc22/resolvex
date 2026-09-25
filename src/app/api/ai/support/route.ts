import { NextResponse } from "next/server";
import { z } from "zod";
import { askArlo } from "@/lib/ai/arlo";

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
  "ResolveX provides a shared inbox, Arlo AI resolutions, a help center, website chat, approved knowledge ingestion, workflows, reports, and provider-connected voice handoff. The One plan is $15 per full agent each month and includes 50 AI resolutions. Additional completed AI resolutions are $0.39 each; drafts and human handoffs are not billed. Human collaborators are free. The trial lasts 7 days, includes Arlo text replies, and Dodo Payments securely authorises a payment method at checkout. AI voice ($0.12 per minute) and AI phone calls on the customer's own number start with the paid plan.";

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
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
