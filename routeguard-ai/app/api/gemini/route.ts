import { NextResponse } from "next/server";

import { getGeminiDecision } from "@/lib/server/gemini-api";
import { ApiError } from "@/lib/server/http";
import { parseGeminiPayload } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = parseGeminiPayload(await request.json());
    const decision = await getGeminiDecision(payload);

    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unexpected server error while fetching Gemini reasoning." },
      { status: 500 }
    );
  }
}
