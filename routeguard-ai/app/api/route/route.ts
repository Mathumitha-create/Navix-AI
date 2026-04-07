import { NextResponse } from "next/server";

import { getRouteData } from "@/lib/server/routes-api";
import { ApiError } from "@/lib/server/http";
import { parseRoutePayload } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = parseRoutePayload(await request.json());
    const route = await getRouteData(payload);

    return NextResponse.json(route);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while fetching route data.",
      },
      { status: 500 }
    );
  }
}
