"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { RouteMap } from "@/components/maps/route-map";

export function ProblemSimulationView() {
  const [delayState, setDelayState] = useState({
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
        className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,84,104,0.18),_transparent_62%)] blur-3xl"
      />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-16 sm:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="glass-card inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs uppercase tracking-[0.28em] text-rose-100/80">
            <span className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.85)]" />
            Failure simulation
          </div>

          <div className="mt-8 max-w-4xl">
            <h1 className="gradient-text text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Problem Simulation
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/64 sm:text-xl">
              A disruption emerges directly on the active route, the truck hits
              the danger zone, and operations lose time because there was no
              predictive intervention.
            </p>
          </div>

          <motion.div
            animate={delayState.detected ? { scale: [1, 1.01, 1] } : { scale: 1 }}
            transition={{ duration: 0.55 }}
            className="alert-surface mt-10 rounded-[2rem] border border-rose-400/20 bg-[linear-gradient(135deg,rgba(127,29,29,0.72),rgba(69,10,10,0.88))] p-6 shadow-[0_24px_90px_rgba(127,29,29,0.38)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-rose-100/70">
                  Warning Banner
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  No prediction system - Delay occurred
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-50/80">
                  The route looked healthy until the truck entered a high-risk
                  corridor. Without early detection, the disruption appears too
                  late and the shipment stalls in real time.
                </p>
              </div>
              <div className="glass-card rounded-2xl px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-rose-100/55">
                  Live status
                </p>
                <p className={`mt-2 text-lg font-medium text-white ${delayState.detected ? "animate-alert-pulse" : ""}`}>
                  {delayState.detected
                    ? "Unexpected delay detected!"
                    : "Monitoring the route..."}
                </p>
                <p className="mt-1 text-sm text-rose-50/75">
                  {delayState.paused
                    ? "Truck movement temporarily stalled in the risk zone."
                    : delayState.detected
                      ? "Delay event triggered after entering the warning area."
                      : "Simulation is waiting for the disruption point."}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <RouteMap
              simulationMode="problem"
              heightClassName="h-[32rem]"
              onSimulationStateChange={setDelayState}
            />

            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                Failure Breakdown
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                What goes wrong here
              </h2>
              <div className="mt-6 space-y-4">
                <div className="glass-card rounded-2xl border-rose-400/15 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-100">
                    Red risk zone blocks the active corridor
                  </p>
                  <p className="mt-2 text-sm leading-7 text-rose-50/70">
                    The truck crosses directly into a hazardous segment with no
                    early rerouting or preventive alert.
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm font-medium text-white">
                    Delay compounds instantly
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/64">
                    Once the vehicle enters the zone, progress halts for several
                    seconds to dramatize the impact of late detection.
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm font-medium text-white">
                    No predictive safety net
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/64">
                    This view shows the failure mode that RouteGuard AI is meant
                    to prevent before it reaches operations.
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
