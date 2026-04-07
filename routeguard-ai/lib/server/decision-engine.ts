type DecisionInput = {
  trafficDelay: number;
  weatherCondition: string;
};

type DecisionResult = {
  riskLevel: "low" | "medium" | "high";
  delayPrediction: string;
};

function normalizeWeatherCondition(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("storm") || normalized.includes("thunder")) {
    return "storm";
  }

  if (normalized.includes("rain") || normalized.includes("drizzle")) {
    return "rain";
  }

  return "clear";
}

function getRiskScore(input: DecisionInput) {
  let score = 0;
  const normalizedWeather = normalizeWeatherCondition(input.weatherCondition);

  if (input.trafficDelay > 15) {
    score += 3;
  } else if (input.trafficDelay >= 8) {
    score += 2;
  } else if (input.trafficDelay > 0) {
    score += 1;
  }

  if (normalizedWeather === "rain") {
    score += 1;
  }

  if (normalizedWeather === "storm") {
    score += 2;
  }

  return {
    score,
    normalizedWeather,
  };
}

function getRiskLevel(score: number): DecisionResult["riskLevel"] {
  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function getDelayPrediction(params: {
  trafficDelay: number;
  normalizedWeather: string;
  riskLevel: DecisionResult["riskLevel"];
}) {
  const { trafficDelay, normalizedWeather, riskLevel } = params;

  if (riskLevel === "high") {
    if (normalizedWeather === "storm") {
      return `Severe delay likely: expect ${Math.max(
        30,
        Math.round(trafficDelay + 20)
      )}-${Math.max(45, Math.round(trafficDelay + 35))} min disruption.`;
    }

    return `Major delay likely: expect ${Math.max(
      20,
      Math.round(trafficDelay + 10)
    )}-${Math.max(35, Math.round(trafficDelay + 20))} min impact.`;
  }

  if (riskLevel === "medium") {
    return `Moderate delay possible: expect ${Math.max(
      10,
      Math.round(trafficDelay)
    )}-${Math.max(20, Math.round(trafficDelay + 10))} min impact.`;
  }

  return "Delay risk is low: route should remain close to planned ETA.";
}

export function evaluateRouteRisk(input: DecisionInput): DecisionResult {
  const { score, normalizedWeather } = getRiskScore(input);
  const riskLevel = getRiskLevel(score);

  return {
    riskLevel,
    delayPrediction: getDelayPrediction({
      trafficDelay: input.trafficDelay,
      normalizedWeather,
      riskLevel,
    }),
  };
}
