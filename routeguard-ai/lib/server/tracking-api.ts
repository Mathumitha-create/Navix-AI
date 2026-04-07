import { withCache } from "@/lib/server/cache";
import { getRouteData } from "@/lib/server/routes-api";
import { getWeatherData } from "@/lib/server/weather-api";
import type { CoordinateInput } from "@/lib/server/validation";

export type TrackingResult = {
  trafficDelay: number;
  weatherCondition: "rain" | "clear" | "storm";
  weatherRiskLevel: "low" | "medium" | "high";
  updatedEta: string;
  updatedEtaSeconds: number;
  remainingDistance: number;
  temperature: number;
};

const TRACKING_CACHE_MS = 15_000;

function parseDurationSeconds(value: string) {
  const match = value.match(/([\d.]+)s/);
  return match ? Number(match[1]) : 0;
}

export async function getTrackingSnapshot(params: {
  currentLocation: CoordinateInput;
  destination: CoordinateInput;
}): Promise<TrackingResult> {
  const { currentLocation, destination } = params;
  const cacheKey = [
    "tracking",
    currentLocation.lat.toFixed(3),
    currentLocation.lng.toFixed(3),
    destination.lat.toFixed(3),
    destination.lng.toFixed(3),
  ].join(":");

  return withCache(cacheKey, TRACKING_CACHE_MS, async () => {
    const [route, weather] = await Promise.all([
      getRouteData({
        source: currentLocation,
        destination,
      }),
      getWeatherData({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      }),
    ]);

    const baseDurationSeconds = parseDurationSeconds(route.duration);
    const trafficDurationSeconds = parseDurationSeconds(route.trafficDuration);

    return {
      trafficDelay: Math.max(0, Math.round((trafficDurationSeconds - baseDurationSeconds) / 60)),
      weatherCondition: weather.condition,
      weatherRiskLevel: weather.riskLevel,
      updatedEta: route.trafficDuration,
      updatedEtaSeconds: trafficDurationSeconds || baseDurationSeconds,
      remainingDistance: route.distance,
      temperature: weather.temperature,
    };
  });
}
