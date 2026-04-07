import { getServerEnv } from "@/lib/server/env";
import { ApiError, parseJson } from "@/lib/server/http";

type GeminiRequest = {
  trafficDelay: number;
  weatherCondition: string;
  routeRisk: string;
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiResult = {
  reasoning: string;
  decision: "reroute" | "stay";
};

function extractText(data: GeminiApiResponse) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

function parseGeminiOutput(text: string): GeminiResult {
  try {
    const parsed = JSON.parse(text) as Partial<GeminiResult>;

    if (
      typeof parsed.reasoning === "string" &&
      (parsed.decision === "reroute" || parsed.decision === "stay")
    ) {
      return {
        reasoning: parsed.reasoning,
        decision: parsed.decision,
      };
    }
  } catch {
    // fall through to heuristic parsing
  }

  return {
    reasoning: text || "No reasoning returned by Gemini.",
    decision: /reroute/i.test(text) ? "reroute" : "stay",
  };
}

export async function getGeminiDecision(
  payload: GeminiRequest
): Promise<GeminiResult> {
  const { geminiApiKey } = getServerEnv();

  const prompt = [
    "You are a logistics decision assistant.",
    "Given the structured route conditions, decide whether the truck should reroute.",
    "Return JSON only with keys: reasoning and decision.",
    'The decision must be either "reroute" or "stay".',
    "",
    `trafficDelayMinutes: ${payload.trafficDelay}`,
    `weatherCondition: ${payload.weatherCondition}`,
    `routeRisk: ${payload.routeRisk}`,
  ].join("\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    }
  );

  const data = await parseJson<GeminiApiResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.error?.message || "Failed to fetch a decision from Gemini.",
      response.status
    );
  }

  const text = extractText(data);

  if (!text) {
    throw new ApiError("Gemini did not return any usable content.", 502);
  }

  return parseGeminiOutput(text);
}
