import { NextResponse } from "next/server";

import { evaluateRouteRisk } from "@/lib/server/decision-engine";
import { ApiError } from "@/lib/server/http";
import { parseDecisionPayload } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = parseDecisionPayload(await request.json());
    const decision = evaluateRouteRisk(payload);

    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unexpected server error while evaluating route risk." },
      { status: 500 }
    );
  }
}
