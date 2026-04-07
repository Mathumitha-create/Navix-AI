import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/http";
import { reverseGeocode } from "@/lib/server/places-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      latitude?: unknown;
      longitude?: unknown;
    };

    if (typeof body.latitude !== "number" || Number.isNaN(body.latitude)) {
      throw new ApiError("latitude must be a valid number.");
    }

    if (typeof body.longitude !== "number" || Number.isNaN(body.longitude)) {
      throw new ApiError("longitude must be a valid number.");
    }

    const place = await reverseGeocode({
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return NextResponse.json(place);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unexpected server error while resolving the current location." },
      { status: 500 }
    );
  }
}
