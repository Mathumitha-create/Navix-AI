import React from "react";
import {
  BrainCircuit,
  Clock3,
  CloudRain,
  Route,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { PreJourneyPrediction } from "../types";
import { cn } from "../lib/utils";

interface PreJourneyPanelProps {
  prediction: PreJourneyPrediction | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

const riskTone = (riskLevel: "low" | "medium" | "high") => {
  if (riskLevel === "high") return "bg-red-50 text-red-700 border-red-100";
  if (riskLevel === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
};

const routeLabel = (routeId: "original" | "alternate") =>
  routeId === "original" ? "Original Route" : "Alternate Route";

const PreJourneyPanel: React.FC<PreJourneyPanelProps> = ({
  prediction,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <section className="mb-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-3">
            <BrainCircuit className="w-3.5 h-3.5" />
            AI Risk Prediction Dashboard
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Predictive route risk analysis before dispatch
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            The system forecasts likely disruptions using expected traffic,
            weather conditions, and route distance before the truck starts.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Forecast"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && !prediction ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse"
            >
              <div className="h-3 rounded bg-gray-200 w-1/3 mb-3" />
              <div className="h-6 rounded bg-gray-200 w-2/3 mb-4" />
              <div className="h-3 rounded bg-gray-200 w-full mb-2" />
              <div className="h-3 rounded bg-gray-200 w-5/6" />
            </div>
          ))}
        </div>
      ) : prediction ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Delay Probability</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {(prediction.delayProbability * 100).toFixed(0)}%
              </div>
              <div
                className={cn(
                  "mt-3 inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold",
                  riskTone(prediction.overallRiskLevel),
                )}
              >
                {prediction.overallRiskLevel.toUpperCase()} RISK
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Predicted Event</span>
                <TriangleAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {prediction.headline}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Forecast generated at {prediction.generatedAt}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">AI Recommendation</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                Choose {routeLabel(prediction.recommendedRoute)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Safer option based on forecasted risk exposure.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Route className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-gray-900">Route Comparison</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prediction.routes.map((route) => {
                  const recommended =
                    route.routeId === prediction.recommendedRoute;

                  return (
                    <div
                      key={route.routeId}
                      className={cn(
                        "rounded-2xl border p-4 transition-all",
                        recommended
                          ? "border-emerald-200 bg-emerald-50/70 shadow-sm"
                          : "border-gray-100 bg-white",
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-sm text-gray-500">
                            {routeLabel(route.routeId)}
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {route.routeName}
                          </div>
                        </div>
                        {recommended && (
                          <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            Recommended
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Estimated Time</span>
                          <span className="font-semibold text-gray-900">
                            {route.estimatedTimeMinutes} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Risk</span>
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full border text-xs font-semibold",
                              riskTone(route.riskLevel),
                            )}
                          >
                            {route.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">
                            Delay Probability
                          </span>
                          <span className="font-semibold text-gray-900">
                            {(route.delayProbability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          {route.recommendation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CloudRain className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-gray-900">Predicted Risk Zones</h3>
              </div>
              <div className="space-y-3">
                {prediction.riskZones.map((zone, index) => (
                  <div
                    key={`${zone.route}-${zone.startIndex}-${index}`}
                    className={cn(
                      "rounded-xl border p-3",
                      riskTone(zone.riskLevel),
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        {zone.route === "original"
                          ? "Original route"
                          : "Alternate route"}{" "}
                        risk segment
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-medium">
                        <Clock3 className="w-3.5 h-3.5" />
                        {zone.etaLabel}
                      </div>
                    </div>
                    <div className="text-sm mt-2">{zone.reason}</div>
                    <div className="text-xs mt-2 opacity-80">{`Traffic forecast ${zone.trafficForecast}% • Weather ${zone.weather}`}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  Why the AI flagged this trip
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {prediction.reasons.map((reason, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default PreJourneyPanel;
