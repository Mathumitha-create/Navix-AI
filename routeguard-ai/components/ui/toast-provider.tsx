"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "info" | "success" | "warning";

type ToastInput = {
  title: string;
  message?: string | null;
  tone?: ToastTone;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  info: "border-cyan-300/20 bg-cyan-500/12 text-cyan-50",
  success: "border-emerald-300/20 bg-emerald-500/12 text-emerald-50",
  warning: "border-rose-300/20 bg-rose-500/14 text-rose-50",
};

function playToastSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const audioContext = new AudioContextCtor();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.16);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.24);

  void audioContext.close().catch(() => undefined);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timeoutMapRef = useRef(new Map<string, number>());

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        tone: toast.tone ?? "info",
        title: toast.title,
        message: toast.message ?? null,
      };

      setToasts((current) => [item, ...current].slice(0, 4));

      if (soundEnabled) {
        playToastSound();
      }

      const timeoutId = window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id));
        timeoutMapRef.current.delete(id);
      }, 4800);

      timeoutMapRef.current.set(id, timeoutId);
    },
    [soundEnabled]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => !current);
  }, []);

  const contextValue = useMemo(
    () => ({
      pushToast,
      soundEnabled,
      toggleSound,
    }),
    [pushToast, soundEnabled, toggleSound]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] mx-auto flex w-full max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleSound}
              className="glass-card rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white/72 transition hover:bg-white/10"
            >
              Sound {soundEnabled ? "On" : "Off"}
            </button>
          </div>

          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel rounded-[1.5rem] p-4"
              >
                <div
                  className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[toast.tone ?? "info"]}`}
                >
                  {toast.tone ?? "info"}
                </div>
                <p className="mt-3 text-sm font-medium text-white">{toast.title}</p>
                {toast.message ? (
                  <p className="mt-2 text-sm leading-6 text-white/68">{toast.message}</p>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
