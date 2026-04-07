"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { RoutePreview } from "@/components/landing/route-preview";
import {
  getDefaultRouteSelection,
  RouteSelector,
} from "@/components/landing/route-selector";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function Hero() {
  const [selectedRoute, setSelectedRoute] = useState(getDefaultRouteSelection);

  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-hero-grid bg-[size:72px_72px] opacity-[0.045]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(65,230,255,0.2),_transparent_65%)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-[10%] top-[18%] h-40 w-40 animate-pulse-glow rounded-full bg-[radial-gradient(circle,_rgba(111,111,255,0.14),_transparent_70%)] blur-3xl"
      />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative"
        >
          <motion.div
            variants={item}
            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/50 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-accent-bright shadow-[0_0_18px_rgba(123,241,255,0.75)]" />
            Predictive route intelligence
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-8 max-w-5xl text-5xl font-semibold tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl"
          >
            <span className="gradient-text">RouteGuard AI</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-2xl text-lg leading-8 text-white/64 sm:text-xl"
          >
            Select a route once and watch the full journey unfold here: route fetch,
            truck movement, live tracking, disruption detection, AI rerouting, and
            delivery completion.
          </motion.p>

          <motion.div variants={item}>
            <RouteSelector
              source={selectedRoute.source}
              destination={selectedRoute.destination}
              onPredictRoute={setSelectedRoute}
            />
          </motion.div>

          <motion.div
            variants={item}
            className="mt-14"
          >
            <RoutePreview source={selectedRoute.source} destination={selectedRoute.destination} />
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
