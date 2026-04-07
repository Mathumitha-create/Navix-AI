import { withCache } from "@/lib/server/cache";
import { getOpenWeatherApiKey } from "@/lib/server/env";
import { ApiError, parseJson } from "@/lib/server/http";

type OpenWeatherApiResponse = {
  weather?: Array<{
    main?: string;
    description?: string;
  }>;
  main?: {
    temp?: number;
  };
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  snow?: {
    "1h"?: number;
    "3h"?: number;
  };
  alerts?: Array<unknown>;
  cod?: number | string;
  message?: string;
};

export type WeatherResult = {
  condition: "rain" | "clear" | "storm";
  temperature: number;
  riskLevel: "low" | "medium" | "high";
};

const WEATHER_CACHE_MS = 15_000;

function normalizeCondition(value?: string, description?: string): WeatherResult["condition"] {
  const combined = `${value ?? ""} ${description ?? ""}`.trim().toLowerCase();

  if (
    combined.includes("thunder") ||
    combined.includes("storm") ||
    combined.includes("tornado") ||
    combined.includes("squall")
  ) {
    return "storm";
  }

  if (
    combined.includes("rain") ||
    combined.includes("drizzle") ||
    combined.includes("snow") ||
    combined.includes("mist")
  ) {
    return "rain";
  }

  return "clear";
}

function getRiskLevel(params: {
  condition: WeatherResult["condition"];
  rainVolume: number;
  snowVolume: number;
  hasAlerts: boolean;
}): WeatherResult["riskLevel"] {
  const { condition, rainVolume, snowVolume, hasAlerts } = params;

  if (condition === "storm" || hasAlerts || rainVolume >= 2 || snowVolume >= 1) {
    return "high";
  }

  if (condition === "rain" || rainVolume > 0 || snowVolume > 0) {
    return "medium";
  }

  return "low";
}

export async function getWeatherData(params: {
  latitude: number;
  longitude: number;
}): Promise<WeatherResult> {
  const { latitude, longitude } = params;
  const cacheKey = `openweather:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;

  return withCache(cacheKey, WEATHER_CACHE_MS, async () => {
    const openWeatherApiKey = getOpenWeatherApiKey();
    const query = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      appid: openWeatherApiKey,
      units: "metric",
    });

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await parseJson<OpenWeatherApiResponse>(response);

    if (!response.ok || (typeof data.cod === "number" && data.cod >= 400)) {
      throw new ApiError(
        data.message || "Failed to fetch weather from OpenWeather.",
        response.status || 502
      );
    }

    const primaryWeather = data.weather?.[0];
    const condition = normalizeCondition(primaryWeather?.main, primaryWeather?.description);
    const temperature = data.main?.temp;

    if (typeof temperature !== "number") {
      throw new ApiError("OpenWeather response was missing temperature data.", 502);
    }

    const rainVolume = data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0;
    const snowVolume = data.snow?.["1h"] ?? data.snow?.["3h"] ?? 0;
    const hasAlerts = Boolean(data.alerts?.length);

    return {
      condition,
      temperature,
      riskLevel: getRiskLevel({
        condition,
        rainVolume,
        snowVolume,
        hasAlerts,
      }),
    };
  });
}
