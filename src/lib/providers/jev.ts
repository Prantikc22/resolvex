import "server-only";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JevQuestion =
  | {
      type: "choice";
      instructions: JsonValue;
      criteria: Record<string, JsonValue>;
    }
  | {
      type: "score";
      instructions: JsonValue;
      criteria: JsonValue[];
    }
  | {
      type: "noul";
      instructions: JsonValue;
      criteria?: { true: JsonValue; false: JsonValue };
    };

export type JevAnswers = Record<
  string,
  {
    type: "choice" | "score" | "noul";
    choice?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
    score?: number;
    noul?: number;
    legend?: Record<string, string>;
  }
>;

export function jevConfigured() {
  return Boolean(process.env.JEV_API_KEY?.trim());
}

export async function askJev(input: {
  state: JsonValue;
  questions: Record<string, JevQuestion>;
}) {
  const apiKey = process.env.JEV_API_KEY?.trim();
  if (!apiKey) throw new Error("ResolveX Decisions is not configured.");
  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state: input.state,
      questions: input.questions,
    }),
  });
  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { message: raw.slice(0, 300) };
  }
  if (!response.ok)
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : `ResolveX Decisions returned ${response.status}.`,
    );
  if (!body.answers || typeof body.answers !== "object")
    throw new Error("ResolveX Decisions returned an invalid response.");
  return body.answers as JevAnswers;
}

export async function classifyCustomerSignal(state: JsonValue) {
  const answers = await askJev({
    state,
    questions: {
      intent: {
        type: "choice",
        instructions:
          "Choose the primary team that should own this customer signal.",
        criteria: {
          billing: "Payments, invoices, refunds, subscriptions, or charges.",
          technical: "A bug, outage, broken integration, or technical problem.",
          sales:
            "A purchase, pricing, product-fit, demo, or commercial opportunity.",
          success:
            "Adoption, onboarding, retention, account outcomes, or expansion.",
          general: "A valid customer message that does not fit another team.",
        },
      },
      urgency: {
        type: "score",
        instructions:
          "Score how quickly a human should review this customer signal.",
        criteria: [
          "Routine; no time pressure",
          "Should be reviewed today",
          "Urgent; material customer impact",
          "Critical; revenue, safety, security, or churn risk",
        ],
      },
      needs_human: {
        type: "noul",
        instructions:
          "Does this signal require human judgment, authority, or an immediate human response?",
        criteria: {
          true: "Human attention is required.",
          false: "A bounded automated response is safe.",
        },
      },
    },
  });
  return {
    intent: answers.intent?.choice ?? "general",
    confidence: Number(answers.intent?.confidence ?? 0),
    urgencyScore: Number(answers.urgency?.score ?? 0),
    urgencyConfidence: Number(answers.urgency?.confidence ?? 0),
    needsHumanProbability: Number(answers.needs_human?.noul ?? 0),
  };
}
