import { NextResponse } from "next/server";

import { getWeatherData } from "@/lib/server/weather-api";
import { ApiError } from "@/lib/server/http";
import { parseWeatherPayload } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = parseWeatherPayload(await request.json());
    const weather = await getWeatherData(payload);

    return NextResponse.json(weather);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while fetching weather data.",
      },
      { status: 500 }
    );
  }
}
