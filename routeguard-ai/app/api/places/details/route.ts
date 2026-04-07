import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/http";
import { getPlaceDetails } from "@/lib/server/places-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { placeId?: unknown };

    if (typeof body.placeId !== "string") {
      throw new ApiError("placeId must be a string.");
    }

    const place = await getPlaceDetails(body.placeId);
    return NextResponse.json(place);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unexpected server error while fetching place details." },
      { status: 500 }
    );
  }
}
