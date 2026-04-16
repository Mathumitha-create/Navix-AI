import { GoogleGenAI, Type } from "@google/genai";
import {
  PredictionInput,
  PredictionResult,
  PreJourneyInput,
  PreJourneyPrediction,
  RiskLevel,
} from "../types";

const apiKey = process.env.GEMINI_API_KEY;

const normalizeRiskLevel = (value: string | undefined): RiskLevel => {
  if (value === "high" || value === "medium") return value;
  return "low";
};

const buildHeuristicPreJourneyPrediction = (
  input: PreJourneyInput,
): PreJourneyPrediction => {
  const peakTraffic = input.departureHour >= 15 && input.departureHour <= 18;
  const rainWindow = input.departureHour >= 14 && input.departureHour <= 19;

  const originalDelayProbability = peakTraffic ? 0.78 : 0.58;
  const alternateDelayProbability = rainWindow ? 0.34 : 0.22;

  return {
    overallRiskLevel: peakTraffic ? "high" : "medium",
    delayProbability: originalDelayProbability,
    headline: peakTraffic
      ? "High risk zone detected near the route midpoint"
      : "Moderate route disruption risk predicted",
    reasons: [
      peakTraffic
        ? "Heavy traffic is expected around the urban midpoint during the selected departure window."
        : "Traffic density is rising steadily during the current departure window.",
      rainWindow
        ? "Rain is forecast near the midpoint, increasing braking distance and reducing visibility."
        : "Weather remains mostly clear, but congestion still creates timing uncertainty.",
      "The alternate path adds a little distance but reduces exposure to the most congested segment.",
    ],
    recommendedRoute: "alternate",
    riskZones: [
      {
        route: "original",
        startIndex: 2,
        endIndex: 5,
        reason: peakTraffic
          ? "Heavy traffic expected around 3:00 PM with repeated slowdowns in the central corridor."
          : "Congestion buildup expected through the central corridor.",
        etaLabel: "3:00 PM",
        riskLevel: peakTraffic ? "high" : "medium",
        trafficForecast: peakTraffic ? 86 : 61,
        weather: rainWindow ? "rain" : "clear",
      },
      {
        route: "alternate",
        startIndex: 4,
        endIndex: 6,
        reason: "Light rain is possible, but this route avoids the most severe traffic cluster.",
        etaLabel: "3:20 PM",
        riskLevel: rainWindow ? "medium" : "low",
        trafficForecast: 38,
        weather: rainWindow ? "rain" : "clear",
      },
    ],
    routes: [
      {
        routeId: "original",
        routeName: "Chennai city corridor via Poonamallee",
        estimatedTimeMinutes: 42,
        delayProbability: originalDelayProbability,
        riskLevel: peakTraffic ? "high" : "medium",
        recommendation:
          "Shortest practical corridor, but the Poonamallee stretch is the main congestion hotspot.",
      },
      {
        routeId: "alternate",
        routeName: "Sriperumbudur bypass arc",
        estimatedTimeMinutes: 53,
        delayProbability: alternateDelayProbability,
        riskLevel: rainWindow ? "medium" : "low",
        recommendation:
          "Slightly longer, but steadier because it avoids the heaviest city choke points.",
      },
    ],
    generatedAt: new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
};

export async function predictDelay(
  input: PredictionInput,
): Promise<PredictionResult> {
  if (!apiKey) {
    const delay =
      input.traffic > 70 || (input.traffic > 40 && input.weather === 1) ? 1 : 0;
    return { delay: delay as 0 | 1, confidence: 0.85 };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Predict if there will be a delivery delay based on:
        Traffic: ${input.traffic}/100
        Weather: ${input.weather === 1 ? "Rainy" : "Clear"}
        Distance Remaining: ${input.distance}km

        Return JSON with "delay" (0 or 1) and "confidence" (0-1).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            delay: {
              type: Type.INTEGER,
              description: "0 for no delay, 1 for delay",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score",
            },
          },
          required: ["delay", "confidence"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      delay: result.delay === 1 ? 1 : 0,
      confidence: result.confidence || 0.9,
    };
  } catch (error) {
    console.error("AI Prediction Error:", error);
    const delay =
      input.traffic > 70 || (input.traffic > 40 && input.weather === 1) ? 1 : 0;
    return { delay: delay as 0 | 1, confidence: 0.7 };
  }
}

export async function predictPreJourneyRisk(
  input: PreJourneyInput,
): Promise<PreJourneyPrediction> {
  if (!apiKey) {
    return buildHeuristicPreJourneyPrediction(input);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a logistics risk analyst. Predict pre-journey delay risk for two delivery routes.
Departure time: ${input.departureHour}:00
Route A is shorter but passes through an urban midpoint.
Route B is slightly longer and more inland.

Return JSON with:
- overallRiskLevel: low | medium | high
- delayProbability: number between 0 and 1 for Route A overall
- headline: short warning headline
- reasons: array of 3 concise strings
- recommendedRoute: original or alternate
- riskZones: array of objects with route, startIndex, endIndex, reason, etaLabel, riskLevel, trafficForecast, weather
- routes: array of objects with routeId, routeName, estimatedTimeMinutes, delayProbability, riskLevel, recommendation`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRiskLevel: { type: Type.STRING },
            delayProbability: { type: Type.NUMBER },
            headline: { type: Type.STRING },
            reasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedRoute: { type: Type.STRING },
            riskZones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  route: { type: Type.STRING },
                  startIndex: { type: Type.INTEGER },
                  endIndex: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                  etaLabel: { type: Type.STRING },
                  riskLevel: { type: Type.STRING },
                  trafficForecast: { type: Type.INTEGER },
                  weather: { type: Type.STRING },
                },
                required: [
                  "route",
                  "startIndex",
                  "endIndex",
                  "reason",
                  "etaLabel",
                  "riskLevel",
                  "trafficForecast",
                  "weather",
                ],
              },
            },
            routes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  routeId: { type: Type.STRING },
                  routeName: { type: Type.STRING },
                  estimatedTimeMinutes: { type: Type.INTEGER },
                  delayProbability: { type: Type.NUMBER },
                  riskLevel: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: [
                  "routeId",
                  "routeName",
                  "estimatedTimeMinutes",
                  "delayProbability",
                  "riskLevel",
                  "recommendation",
                ],
              },
            },
          },
          required: [
            "overallRiskLevel",
            "delayProbability",
            "headline",
            "reasons",
            "recommendedRoute",
            "riskZones",
            "routes",
          ],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    const fallback = buildHeuristicPreJourneyPrediction(input);

    const parsedRoutes = Array.isArray(result.routes)
      ? result.routes.slice(0, 2).map((route: any, index: number) => {
          const fallbackRoute = index === 0 ? fallback.routes[0] : fallback.routes[1];

          return {
            routeId: fallbackRoute.routeId,
            routeName: route.routeName || fallbackRoute.routeName,
            estimatedTimeMinutes:
              Number(route.estimatedTimeMinutes) || fallbackRoute.estimatedTimeMinutes,
            delayProbability: route.delayProbability !== undefined
              ? Number(route.delayProbability)
              : fallbackRoute.delayProbability,
            riskLevel: normalizeRiskLevel(route.riskLevel),
            recommendation: route.recommendation || fallbackRoute.recommendation,
          };
        })
      : fallback.routes;

    // Enforce logical recommendation: always recommend the route with lower delay risk
    const bestRoute =
      parsedRoutes.length > 1 && parsedRoutes[0].delayProbability > parsedRoutes[1].delayProbability
        ? parsedRoutes[1].routeId
        : parsedRoutes[0]?.routeId || "original";

    return {
      overallRiskLevel: normalizeRiskLevel(result.overallRiskLevel),
      delayProbability: Number(result.delayProbability) || fallback.delayProbability,
      headline: result.headline || fallback.headline,
      reasons:
        Array.isArray(result.reasons) && result.reasons.length > 0
          ? result.reasons.slice(0, 3)
          : fallback.reasons,
      recommendedRoute: bestRoute as "original" | "alternate",
      riskZones: Array.isArray(result.riskZones)
        ? result.riskZones.map((zone: any) => ({
            route: zone.route === "alternate" ? "alternate" : "original",
            startIndex: Number(zone.startIndex) || 0,
            endIndex: Number(zone.endIndex) || 1,
            reason: zone.reason || "Potential disruption detected.",
            etaLabel: zone.etaLabel || "3:00 PM",
            riskLevel: normalizeRiskLevel(zone.riskLevel),
            trafficForecast: Number(zone.trafficForecast) || 50,
            weather: zone.weather === "rain" ? "rain" : "clear",
          }))
        : fallback.riskZones,
      routes: parsedRoutes,
      generatedAt: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  } catch (error) {
    console.error("Pre-journey AI Prediction Error:", error);
    return buildHeuristicPreJourneyPrediction(input);
  }
}
