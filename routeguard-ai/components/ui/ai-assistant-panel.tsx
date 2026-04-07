"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type AiAssistantPanelProps = {
  title?: string;
  riskLevel?: "LOW" | "HIGH" | null;
  decision?: "reroute" | "continue" | null;
  message?: string | null;
  loading?: boolean;
  accent?: "rose" | "emerald" | "cyan";
};

const accentStyles = {
  rose: "border-rose-400/20 bg-rose-500/10 text-rose-50",
  emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-50",
  cyan: "border-cyan-300/20 bg-cyan-500/10 text-cyan-50",
};

export function AiAssistantPanel({
  title = "AI Assistant",
  riskLevel = null,
  decision = null,
  message,
  loading = false,
  accent = "cyan",
}: AiAssistantPanelProps) {
  const [typedMessage, setTypedMessage] = useState("");

  useEffect(() => {
    if (!message || loading) {
      setTypedMessage("");
      return;
    }

    let currentIndex = 0;
    const interval = window.setInterval(() => {
      currentIndex += 1;
      setTypedMessage(message.slice(0, currentIndex));

      if (currentIndex >= message.length) {
        window.clearInterval(interval);
      }
    }, 18);

    return () => {
      window.clearInterval(interval);
    };
  }, [loading, message]);

  return (
    <div className="glass-panel rounded-[2rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            {title}
          </p>
          <p className="mt-2 text-sm text-white/62">
            Gemini is watching route risk, recommending whether to continue or reroute, and explaining the decision in plain language.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {riskLevel && (
            <div
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${
                riskLevel === "HIGH"
                  ? "border-rose-300/25 bg-rose-500/14 text-rose-100"
                  : "border-emerald-300/25 bg-emerald-500/12 text-emerald-100"
              }`}
            >
              {riskLevel} risk
            </div>
          )}
          <div
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${accentStyles[accent]}`}
          >
            {decision ? decision : "standby"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
          AI
        </div>
        <div className="min-w-0 flex-1 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-white/82">
          <AnimatePresence mode="wait">
            <motion.div
              key={loading ? "loading" : typedMessage || "idle"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {loading ? (
                <div className="flex items-center gap-2 text-white/66">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-200" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-200 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-200 [animation-delay:300ms]" />
                </div>
              ) : typedMessage ? (
                <>
                  <p>{typedMessage}</p>
                  <span className="ml-1 inline-block h-4 w-px animate-pulse bg-white/70 align-middle" />
                </>
              ) : (
                <p className="text-white/55">
                  Live Gemini guidance will appear here as soon as the system detects a disruption.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
