import { getServerEnv } from "@/lib/server/env";
import { ApiError, parseJson } from "@/lib/server/http";
import type { CoordinateInput, LocationInput } from "@/lib/server/validation";

type WaypointRequest =
  | {
      address: string;
    }
  | {
      location: {
        latLng: {
          latitude: number;
          longitude: number;
        };
      };
    };

type RoutesApiResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type RouteResult = {
  polyline: string;
  distance: number;
  duration: string;
  trafficDuration: string;
};

function toWaypoint(input: LocationInput): WaypointRequest {
  if (typeof input === "string") {
    return { address: input };
  }

  const coordinate = input as CoordinateInput;

  return {
    location: {
      latLng: {
        latitude: coordinate.lat,
        longitude: coordinate.lng,
      },
    },
  };
}

export async function getRouteData(params: {
  source: LocationInput;
  destination: LocationInput;
}): Promise<RouteResult> {
  const { googleMapsApiKey } = getServerEnv();

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleMapsApiKey,
      "X-Goog-FieldMask":
        "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: toWaypoint(params.source),
      destination: toWaypoint(params.destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      computeAlternativeRoutes: false,
      units: "METRIC",
      polylineQuality: "OVERVIEW",
    }),
    cache: "no-store",
  });

  const data = await parseJson<RoutesApiResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.error?.message || "Failed to fetch route from Google Routes API.",
      response.status
    );
  }

  const route = data.routes?.[0];

  if (
    !route?.polyline?.encodedPolyline ||
    typeof route.distanceMeters !== "number" ||
    !route.duration
  ) {
    throw new ApiError("Routes API response was missing required route fields.", 502);
  }

  return {
    polyline: route.polyline.encodedPolyline,
    distance: route.distanceMeters,
    duration: route.staticDuration || route.duration,
    trafficDuration: route.duration,
  };
}
