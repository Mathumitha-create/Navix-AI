import { getGeminiApiKey } from "@/lib/server/env";
import { ApiError, parseJson } from "@/lib/server/http";

type GeminiRequest = {
  trafficDelay: number;
  weatherCondition: string;
  remainingDistance: number;
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
  riskLevel: "LOW" | "HIGH";
  explanation: string;
  decision: "reroute" | "continue";
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
      typeof parsed.explanation === "string" &&
      (parsed.decision === "reroute" || parsed.decision === "continue") &&
      (parsed.riskLevel === "LOW" || parsed.riskLevel === "HIGH")
    ) {
      return {
        riskLevel: parsed.riskLevel,
        explanation: parsed.explanation.trim(),
        decision: parsed.decision,
      };
    }
  } catch {
    // fall through to heuristic parsing
  }

  return {
    riskLevel: /high/i.test(text) ? "HIGH" : "LOW",
    explanation: text || "No explanation returned by Gemini.",
    decision: /reroute/i.test(text) ? "reroute" : "continue",
  };
}

export async function getGeminiDecision(
  payload: GeminiRequest
): Promise<GeminiResult> {
  const geminiApiKey = getGeminiApiKey();

  const prompt = [
    "You are an intelligent logistics assistant.",
    "Analyze the following:",
    `Traffic delay: ${payload.trafficDelay} minutes`,
    `Weather: ${payload.weatherCondition}`,
    `Remaining distance: ${payload.remainingDistance} km`,
    "",
    "Will this shipment be delayed?",
    "Respond with:",
    "1. Risk level (LOW or HIGH)",
    "2. Decision (continue or reroute)",
    "3. Short explanation",
    "Keep the explanation concise and user-friendly.",
    'Return JSON only with keys: riskLevel, decision, explanation.',
    'The riskLevel must be either "LOW" or "HIGH".',
    'The decision must be either "reroute" or "continue".',
    "",
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
