"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { RouteMap } from "@/components/maps/route-map";
import { AiAssistantPanel } from "@/components/ui/ai-assistant-panel";
import { useToast } from "@/components/ui/toast-provider";
import type { SavedPlace } from "@/lib/map-config";

type RoutePreviewProps = {
  source: SavedPlace;
  destination: SavedPlace;
};

type LiveRouteState = {
  detected: boolean;
  rerouting: boolean;
  rerouted: boolean;
  completed: boolean;
  status: string;
  trafficDelay: number;
  remainingDistance: number;
  currentLocation: string;
  totalDistance: number;
  etaSeconds: number;
  weatherCondition: string | null;
  weatherRiskLevel: "low" | "medium" | "high" | null;
};

function formatEta(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  return `${hours}h ${remainder}m`;
}

const flowSteps = [
  "Route selected",
  "Route fetched",
  "Truck moving",
  "Tracking active",
  "AI risk scan",
  "Disruption detected",
  "Dynamic reroute",
  "Delivery complete",
];

export function RoutePreview({ source, destination }: RoutePreviewProps) {
  const { pushToast } = useToast();
  const [routeState, setRouteState] = useState<LiveRouteState>({
    detected: false,
    rerouting: false,
    rerouted: false,
    completed: false,
    status: "Waiting for route",
    trafficDelay: 0,
    remainingDistance: 0,
    currentLocation: `${source.lat.toFixed(4)}, ${source.lng.toFixed(4)}`,
    totalDistance: 0,
    etaSeconds: 0,
    weatherCondition: null,
    weatherRiskLevel: null,
  });
  const [aiState, setAiState] = useState<{
    riskLevel: "LOW" | "HIGH" | null;
    decision: "reroute" | "continue" | null;
    explanation: string | null;
    loading: boolean;
  }>({
    riskLevel: null,
    decision: null,
    explanation: null,
    loading: false,
  });

  const detectionToastShownRef = useRef(false);
  const rerouteToastShownRef = useRef(false);
  const completionToastShownRef = useRef(false);

  useEffect(() => {
    detectionToastShownRef.current = false;
    rerouteToastShownRef.current = false;
    completionToastShownRef.current = false;
    setAiState({
      riskLevel: null,
      decision: null,
      explanation: null,
      loading: false,
    });
  }, [destination.name, source.name]);

  useEffect(() => {
    if (!routeState.detected || !routeState.weatherCondition || routeState.completed) {
      return;
    }

    let cancelled = false;

    async function loadGeminiDecision() {
      setAiState((current) => ({ ...current, loading: true }));

      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trafficDelay: routeState.trafficDelay,
            weatherCondition: routeState.weatherCondition,
            remainingDistance: routeState.remainingDistance,
          }),
        });
        const data = await response.json();

        if (cancelled) {
          return;
        }

        setAiState({
          riskLevel: data.riskLevel ?? null,
          decision: data.decision ?? null,
          explanation:
            data.explanation ??
            "RouteGuard AI is analyzing the disruption and preparing guidance.",
          loading: false,
        });
      } catch {
        if (cancelled) {
          return;
        }

        setAiState({
          riskLevel: null,
          decision: null,
          explanation: "AI guidance is temporarily unavailable.",
          loading: false,
        });
      }
    }

    void loadGeminiDecision();

    return () => {
      cancelled = true;
    };
  }, [
    routeState.completed,
    routeState.detected,
    routeState.remainingDistance,
    routeState.trafficDelay,
    routeState.weatherCondition,
  ]);

  useEffect(() => {
    if (!routeState.detected || detectionToastShownRef.current) {
      return;
    }

    detectionToastShownRef.current = true;
    pushToast({
      title: "High traffic ahead",
      message:
        aiState.explanation ??
        "RouteGuard detected a traffic or weather disruption on the current journey.",
      tone: "warning",
    });
  }, [aiState.explanation, pushToast, routeState.detected]);

  useEffect(() => {
    if (
      aiState.decision !== "reroute" ||
      !routeState.rerouted ||
      rerouteToastShownRef.current
    ) {
      return;
    }

    rerouteToastShownRef.current = true;
    pushToast({
      title: "AI rerouted your path",
      message: aiState.explanation ?? "A faster alternate route has been engaged.",
      tone: "success",
    });
  }, [aiState.decision, aiState.explanation, pushToast, routeState.rerouted]);

  useEffect(() => {
    if (!routeState.completed || completionToastShownRef.current) {
      return;
    }

    completionToastShownRef.current = true;
    pushToast({
      title: "Delivery complete",
      message: "The truck reached the destination and the monitored journey is complete.",
      tone: "success",
    });
  }, [pushToast, routeState.completed]);

  const flowIndex = useMemo(() => {
    if (routeState.completed) {
      return 7;
    }

    if (routeState.rerouted) {
      return 6;
    }

    if (routeState.detected) {
      return 5;
    }

    if (routeState.weatherCondition) {
      return 4;
    }

    if (routeState.currentLocation) {
      return 3;
    }

    if (routeState.totalDistance > 0) {
      return 2;
    }

    return 1;
  }, [
    routeState.completed,
    routeState.currentLocation,
    routeState.detected,
    routeState.rerouted,
    routeState.totalDistance,
    routeState.weatherCondition,
  ]);

  const summaryCards = [
    { label: "Distance", value: routeState.totalDistance ? `${routeState.totalDistance.toFixed(1)} km` : "-" },
    { label: "ETA", value: routeState.etaSeconds ? formatEta(routeState.etaSeconds) : "-" },
    { label: "Traffic delay", value: `${routeState.trafficDelay} min` },
    { label: "Remaining", value: `${routeState.remainingDistance.toFixed(1)} km` },
    { label: "Weather", value: routeState.weatherCondition ? routeState.weatherCondition : "-" },
    { label: "Current location", value: routeState.currentLocation },
  ];

  return (
    <section id="simulate" className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">
              Live Route Dashboard
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              One journey. Live tracking, disruption detection, AI rerouting, and delivery completion.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/64">
              Select a route, let the truck start moving, stream live traffic and weather updates
              every 15 seconds, and let RouteGuard AI decide whether the shipment should continue
              or be rerouted.
            </p>
          </div>

          <div className="glass-card rounded-[1.6rem] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Route</p>
            <p className="mt-2 text-sm font-medium text-white">{source.name}</p>
            <p className="text-sm text-white/52">to {destination.name}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8">
          {flowSteps.map((step, index) => {
            const active = index <= flowIndex;
            return (
              <div
                key={step}
                className={`rounded-[1.35rem] border px-4 py-3 text-sm transition ${
                  active
                    ? "border-cyan-300/22 bg-cyan-500/10 text-white"
                    : "border-white/8 bg-white/[0.025] text-white/42"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.24em]">{index + 1}</p>
                <p className="mt-2 leading-6">{step}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <RouteMap
            source={source}
            destination={destination}
            aiDecision={aiState.decision}
            heightClassName="h-[38rem]"
            onRouteStateChange={setRouteState}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="glass-card rounded-[1.4rem] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                  {card.label}
                </p>
                <p className="mt-3 text-base font-medium text-white">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`alert-surface rounded-[2rem] border p-5 ${
              routeState.completed
                ? "border-emerald-400/18 bg-[linear-gradient(135deg,rgba(6,78,59,0.62),rgba(3,24,24,0.9))]"
                : routeState.rerouted
                  ? "border-emerald-400/18 bg-[linear-gradient(135deg,rgba(6,78,59,0.42),rgba(3,24,24,0.85))]"
                  : routeState.detected
                    ? "border-rose-400/18 bg-[linear-gradient(135deg,rgba(127,29,29,0.5),rgba(41,11,11,0.88))]"
                    : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/46">System state</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{routeState.status}</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              {routeState.completed
                ? "The delivery reached its destination successfully."
                : routeState.rerouted
                  ? "The original route has been replaced and the truck is continuing on the optimized corridor."
                  : routeState.detected
                    ? "A disruption has been detected. RouteGuard AI is evaluating the best action for the shipment."
                    : "The route is live, the truck is moving, and monitoring is active."}
            </p>
          </motion.div>

          <AiAssistantPanel
            title="Gemini Guidance"
            riskLevel={aiState.riskLevel}
            decision={aiState.decision}
            message={aiState.explanation}
            loading={aiState.loading}
            accent={routeState.rerouted || routeState.completed ? "emerald" : routeState.detected ? "rose" : "cyan"}
          />

          <div className="glass-panel rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Operational notes</p>
            <div className="mt-4 space-y-3">
              <div className="glass-card rounded-[1.3rem] px-4 py-4">
                <p className="text-sm font-medium text-white">Tracking cadence</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  Traffic and weather are refreshed every 15 seconds through backend APIs with caching and throttling.
                </p>
              </div>
              <div className="glass-card rounded-[1.3rem] px-4 py-4">
                <p className="text-sm font-medium text-white">Disruption logic</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  A sudden traffic delay jump or weather turning to rain or storm triggers AI review.
                </p>
              </div>
              <div className="glass-card rounded-[1.3rem] px-4 py-4">
                <p className="text-sm font-medium text-white">Reroute behavior</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  If Gemini decides to reroute, the current path stays visible in red while the new path turns green and the truck continues without resetting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
