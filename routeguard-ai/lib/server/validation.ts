import { ApiError } from "@/lib/server/http";

export type CoordinateInput = {
  lat: number;
  lng: number;
};

export type LocationInput = string | CoordinateInput;

type RoutePayload = {
  source: LocationInput;
  destination: LocationInput;
};

type WeatherPayload = {
  latitude: number;
  longitude: number;
};

type GeminiPayload = {
  trafficDelay: number;
  weatherCondition: string;
  routeRisk: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown, label: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(`${label} must be a valid number.`);
  }

  return value;
}

export function parseLocationInput(value: unknown, label: string): LocationInput {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new ApiError(`${label} cannot be empty.`);
    }

    return trimmed;
  }

  if (isObject(value)) {
    return {
      lat: parseNumber(value.lat, `${label}.lat`),
      lng: parseNumber(value.lng, `${label}.lng`),
    };
  }

  throw new ApiError(
    `${label} must be either a string address or an object with lat/lng values.`
  );
}

export function parseRoutePayload(input: unknown): RoutePayload {
  if (!isObject(input)) {
    throw new ApiError("Route payload must be a JSON object.");
  }

  return {
    source: parseLocationInput(input.source, "source"),
    destination: parseLocationInput(input.destination, "destination"),
  };
}

export function parseWeatherPayload(input: unknown): WeatherPayload {
  if (!isObject(input)) {
    throw new ApiError("Weather payload must be a JSON object.");
  }

  return {
    latitude: parseNumber(input.latitude, "latitude"),
    longitude: parseNumber(input.longitude, "longitude"),
  };
}

export function parseGeminiPayload(input: unknown): GeminiPayload {
  if (!isObject(input)) {
    throw new ApiError("Gemini payload must be a JSON object.");
  }

  if (typeof input.weatherCondition !== "string" || !input.weatherCondition.trim()) {
    throw new ApiError("weatherCondition must be a non-empty string.");
  }

  if (typeof input.routeRisk !== "string" || !input.routeRisk.trim()) {
    throw new ApiError("routeRisk must be a non-empty string.");
  }

  return {
    trafficDelay: parseNumber(input.trafficDelay, "trafficDelay"),
    weatherCondition: input.weatherCondition.trim(),
    routeRisk: input.routeRisk.trim(),
  };
}
