import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/http";
import { getPlaceSuggestions } from "@/lib/server/places-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: unknown };

    if (typeof body.input !== "string") {
      throw new ApiError("input must be a string.");
    }

    const suggestions = await getPlaceSuggestions(body.input);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unexpected server error while fetching place suggestions." },
      { status: 500 }
    );
  }
}
