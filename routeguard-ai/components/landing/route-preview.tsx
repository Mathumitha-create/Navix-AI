"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { RouteMap } from "@/components/maps/route-map";

type HomepageMode = "problem" | "solution";

const modeContent: Record<
  HomepageMode,
  {
    label: string;
    badge: string;
    title: string;
    description: string;
    banner: string;
    bannerClassName: string;
  }
> = {
  problem: {
    label: "Without AI",
    badge: "Reactive mode",
    title: "The route absorbs the disruption too late.",
    description:
      "The truck heads straight into the red corridor, gets hit by the delay event, and loses momentum because nothing predicted the risk early enough.",
    banner: "No prediction system -> Delay occurred",
    bannerClassName:
      "border-rose-400/20 bg-[linear-gradient(135deg,rgba(127,29,29,0.68),rgba(69,10,10,0.86))] text-rose-50 shadow-[0_18px_60px_rgba(127,29,29,0.24)]",
  },
  solution: {
    label: "With AI",
    badge: "Predictive mode",
    title: "AI catches the hazard and shifts the route early.",
    description:
      "The system spots danger before entry, warns the operator, and bends the truck onto a safer corridor so movement stays smooth.",
    banner: "AI prediction avoided delay",
    bannerClassName:
      "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(6,78,59,0.72),rgba(3,24,24,0.9))] text-emerald-50 shadow-[0_18px_60px_rgba(16,185,129,0.18)]",
  },
};

export function RoutePreview() {
  const [mode, setMode] = useState<HomepageMode>("problem");
  const [simulationState, setSimulationState] = useState({
    detected: false,
    paused: false,
    rerouting: false,
    rerouted: false,
    alert: "Truck en route...",
  });

  const content = modeContent[mode];

  const liveStatus = useMemo(() => {
    if (mode === "problem") {
      if (simulationState.paused) {
        return "Unexpected delay detected!";
      }

      if (simulationState.detected) {
        return "Delay triggered after entering the risk zone.";
      }

      return "Monitoring route without predictive protection.";
    }

    if (simulationState.rerouted) {
      return "Alternate corridor engaged successfully.";
    }

    if (simulationState.rerouting || simulationState.detected) {
      return "High risk ahead - rerouting...";
    }

    return "Watching the corridor with predictive AI.";
  }, [mode, simulationState]);

  return (
    <section id="simulate" className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">
              Live Route View
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Chennai to Bangalore risk corridor
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/64">
              Toggle between a failure path and an AI-assisted reroute to compare
              the same truck journey under two very different decision systems.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[15rem]">
            <div className="glass-card rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                Origin
              </p>
              <p className="mt-2 text-sm text-white">Chennai</p>
            </div>
            <div className="glass-card rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                Destination
              </p>
              <p className="mt-2 text-sm text-white">Bangalore</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="glass-card relative inline-flex rounded-full p-1">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`absolute inset-y-1 w-[calc(50%-0.125rem)] rounded-full ${
                mode === "problem"
                  ? "left-1 bg-rose-500/18 shadow-[0_0_24px_rgba(251,113,133,0.24)]"
                  : "left-[calc(50%+0.125rem)] bg-emerald-500/18 shadow-[0_0_24px_rgba(16,185,129,0.2)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setMode("problem")}
              className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "problem" ? "text-white" : "text-white/55 hover:text-white/75"
              }`}
            >
              Without AI
            </button>
            <button
              type="button"
              onClick={() => setMode("solution")}
              className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "solution" ? "text-white" : "text-white/55 hover:text-white/75"
              }`}
            >
              With AI
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`alert-surface rounded-2xl border px-4 py-3 ${content.bannerClassName}`}
            >
              <p className="text-[11px] uppercase tracking-[0.26em] opacity-70">
                {content.badge}
              </p>
              <p className="mt-2 text-sm font-medium">{content.banner}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.985, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <RouteMap
            simulationMode={mode}
            heightClassName="h-[30rem]"
            onSimulationStateChange={setSimulationState}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-panel`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel rounded-[2rem] p-6"
          >
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">
              {content.label}
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {content.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/64">
              {content.description}
            </p>

            <div className="mt-6 space-y-3">
              <div
                className={`alert-surface rounded-2xl border px-4 py-4 ${
                  mode === "problem"
                    ? "border-rose-400/15 bg-rose-500/10"
                    : "border-emerald-400/15 bg-emerald-500/10"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/48">
                  Live alert
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {simulationState.alert}
                </p>
              </div>

              <div className="glass-card rounded-2xl px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                  What is happening
                </p>
                <p className="mt-2 text-sm leading-7 text-white/68">
                  {liveStatus}
                </p>
              </div>

              <div className="glass-card rounded-2xl px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                  Outcome
                </p>
                <p className="mt-2 text-sm leading-7 text-white/68">
                  {mode === "problem"
                    ? "The truck loses time because the risk is discovered only after impact."
                    : "The route adapts before impact, keeping the journey moving and the ETA more stable."}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
