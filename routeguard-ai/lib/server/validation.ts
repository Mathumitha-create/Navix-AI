import { ApiError } from "@/lib/server/http";

export type CoordinateInput = {
  lat: number;
  lng: number;
};

export type LocationInput = string | CoordinateInput;

type RoutePayload = {
  source: LocationInput;
  destination: LocationInput;
  alternatives: boolean;
};

type WeatherPayload = {
  latitude: number;
  longitude: number;
};

type GeminiPayload = {
  trafficDelay: number;
  weatherCondition: string;
  remainingDistance: number;
};

type DecisionPayload = {
  trafficDelay: number;
  weatherCondition: string;
};

type TrackingPayload = {
  currentLocation: CoordinateInput;
  destination: CoordinateInput;
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
    alternatives: Boolean(input.alternatives),
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

  return {
    trafficDelay: parseNumber(input.trafficDelay, "trafficDelay"),
    weatherCondition: input.weatherCondition.trim(),
    remainingDistance: parseNumber(input.remainingDistance, "remainingDistance"),
  };
}

export function parseDecisionPayload(input: unknown): DecisionPayload {
  if (!isObject(input)) {
    throw new ApiError("Decision payload must be a JSON object.");
  }

  if (typeof input.weatherCondition !== "string" || !input.weatherCondition.trim()) {
    throw new ApiError("weatherCondition must be a non-empty string.");
  }

  return {
    trafficDelay: parseNumber(input.trafficDelay, "trafficDelay"),
    weatherCondition: input.weatherCondition.trim(),
  };
}

export function parseTrackingPayload(input: unknown): TrackingPayload {
  if (!isObject(input)) {
    throw new ApiError("Tracking payload must be a JSON object.");
  }

  const currentLocation = parseLocationInput(input.currentLocation, "currentLocation");
  const destination = parseLocationInput(input.destination, "destination");

  if (typeof currentLocation === "string" || typeof destination === "string") {
    throw new ApiError("currentLocation and destination must be lat/lng objects.");
  }

  return {
    currentLocation,
    destination,
  };
}
