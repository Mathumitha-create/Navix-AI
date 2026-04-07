import { ApiError } from "@/lib/server/http";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new ApiError(`Missing required environment variable: ${name}`, 500);
  }

  return value;
}

export function getGoogleMapsApiKey() {
  return requireEnv("GOOGLE_MAPS_API_KEY");
}

export function getOpenWeatherApiKey() {
  return requireEnv("OPENWEATHER_API_KEY");
}

export function getGeminiApiKey() {
  return requireEnv("GEMINI_API_KEY");
}
