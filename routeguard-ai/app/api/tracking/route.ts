import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/http";
import { getTrackingSnapshot } from "@/lib/server/tracking-api";
import { parseTrackingPayload } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = parseTrackingPayload(await request.json());
    const snapshot = await getTrackingSnapshot(payload);

    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while fetching tracking data.",
      },
      { status: 500 }
    );
  }
}
