import { getServerEnv } from "@/lib/server/env";
import { ApiError, parseJson } from "@/lib/server/http";

type WeatherApiResponse = {
  weatherCondition?: {
    type?: string;
    description?: {
      text?: string;
    };
  };
  temperature?: {
    degrees?: number;
  };
  precipitation?: {
    probability?: {
      percent?: number;
      type?: string;
    };
  };
  thunderstormProbability?: number;
};

type WeatherResult = {
  condition: string;
  temperature: number;
  riskLevel: "low" | "medium" | "high";
};

function normalizeCondition(value?: string) {
  const raw = (value || "CLEAR").toUpperCase();

  if (raw.includes("THUNDER") || raw.includes("STORM")) {
    return "storm";
  }

  if (
    raw.includes("RAIN") ||
    raw.includes("DRIZZLE") ||
    raw.includes("SHOWERS") ||
    raw.includes("SNOW") ||
    raw.includes("SLEET")
  ) {
    return "rain";
  }

  return "clear";
}

function getRiskLevel(params: {
  normalizedCondition: string;
  precipitationChance: number;
  thunderstormProbability: number;
}): "low" | "medium" | "high" {
  const { normalizedCondition, precipitationChance, thunderstormProbability } = params;

  if (
    normalizedCondition === "storm" ||
    thunderstormProbability >= 40 ||
    precipitationChance >= 70
  ) {
    return "high";
  }

  if (normalizedCondition === "rain" || precipitationChance >= 30) {
    return "medium";
  }

  return "low";
}

export async function getWeatherData(params: {
  latitude: number;
  longitude: number;
}): Promise<WeatherResult> {
  const { weatherApiKey } = getServerEnv();
  const query = new URLSearchParams({
    key: weatherApiKey,
    "location.latitude": String(params.latitude),
    "location.longitude": String(params.longitude),
    unitsSystem: "METRIC",
  });

  const response = await fetch(
    `https://weather.googleapis.com/v1/currentConditions:lookup?${query.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data = await parseJson<WeatherApiResponse>(response);

  if (!response.ok) {
    throw new ApiError("Failed to fetch weather from Google Weather API.", response.status);
  }

  const normalizedCondition = normalizeCondition(
    data.weatherCondition?.type || data.weatherCondition?.description?.text
  );
  const temperature = data.temperature?.degrees;

  if (typeof temperature !== "number") {
    throw new ApiError("Weather API response was missing temperature data.", 502);
  }

  const precipitationChance = data.precipitation?.probability?.percent ?? 0;
  const thunderstormProbability = data.thunderstormProbability ?? 0;

  return {
    condition: normalizedCondition,
    temperature,
    riskLevel: getRiskLevel({
      normalizedCondition,
      precipitationChance,
      thunderstormProbability,
    }),
  };
}
