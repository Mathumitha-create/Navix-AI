type ServerEnv = {
  googleMapsApiKey: string;
  weatherApiKey: string;
  geminiApiKey: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  const googleMapsApiKey = requireEnv("GOOGLE_MAPS_API_KEY");

  return {
    googleMapsApiKey,
    // The user asked to use the Google Maps key for Google Maps Platform services.
    weatherApiKey: process.env.WEATHER_API_KEY || googleMapsApiKey,
    geminiApiKey: requireEnv("GEMINI_API_KEY"),
  };
}
