"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { RouteMap } from "@/components/maps/route-map";

export function SolutionSimulationView() {
  const [simulationState, setSimulationState] = useState({
    detected: false,
    paused: false,
    rerouting: false,
    rerouted: false,
    alert: "Truck en route...",
  });

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-hero-grid bg-[size:72px_72px] opacity-[0.045]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-24 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(52,211,153,0.16),_transparent_62%)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-[12%] top-[14%] h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(123,241,255,0.12),_transparent_70%)] blur-3xl"
      />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-16 sm:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="glass-card inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs uppercase tracking-[0.28em] text-emerald-50/85">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.85)]" />
            Predictive intervention
          </div>

          <div className="mt-8 max-w-4xl">
            <h1 className="gradient-text text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Solution Simulation
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/64 sm:text-xl">
              RouteGuard AI spots the high-risk corridor before impact, triggers
              an early reroute, and keeps the truck moving without the dramatic
              stop seen in the failure scenario.
            </p>
          </div>

          <motion.div
            animate={simulationState.rerouting || simulationState.rerouted ? { scale: [1, 1.01, 1] } : { scale: 1 }}
            transition={{ duration: 0.55 }}
            className="alert-surface mt-10 rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(6,78,59,0.82),rgba(3,24,24,0.95))] p-6 shadow-[0_24px_90px_rgba(16,185,129,0.22)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-emerald-100/70">
                  Success Banner
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  AI prediction avoided delay
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/78">
                  The risk is identified before the truck enters the danger
                  area, the route bends around the disruption, and delivery
                  momentum stays intact.
                </p>
              </div>
              <div className="glass-card rounded-2xl px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">
                  Live status
                </p>
                <p className={`mt-2 text-lg font-medium text-white ${simulationState.detected ? "animate-alert-pulse" : ""}`}>
                  {simulationState.detected
                    ? "High risk ahead - rerouting..."
                    : "Monitoring corridor with AI..."}
                </p>
                <p className="mt-1 text-sm text-emerald-50/75">
                  {simulationState.rerouted
                    ? "Alternate path engaged and truck is still moving."
                    : simulationState.rerouting
                      ? "Prediction engine is shifting the truck onto a safer route."
                      : "No stop required. The truck will be redirected before impact."}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <RouteMap
              simulationMode="solution"
              heightClassName="h-[32rem]"
              onSimulationStateChange={setSimulationState}
            />

            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                AI Response
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                What changes with prediction
              </h2>
              <div className="mt-6 space-y-4">
                <div className="glass-card rounded-2xl border-emerald-400/15 bg-emerald-500/10 p-4">
                  <p className="text-sm font-medium text-emerald-100">
                    High risk is detected before the truck enters the zone
                  </p>
                  <p className="mt-2 text-sm leading-7 text-emerald-50/72">
                    The alert appears early enough to intervene instead of
                    reacting after the route is already compromised.
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm font-medium text-white">
                    Route dynamically bends around the disruption
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/64">
                    A safer green corridor replaces the risky segment while the
                    truck animation continues smoothly with no hard pause.
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm font-medium text-white">
                    Delivery flow stays stable
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/64">
                    This is the operational outcome RouteGuard AI is designed to
                    create: fewer surprises, less idle time, and better ETA
                    confidence.
                  </p>
                </div>
              </div>

              <Link
                href="/"
                className="glass-card mt-8 inline-flex rounded-full px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to landing page
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
