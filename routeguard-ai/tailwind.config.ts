import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          bright: "var(--accent-bright)",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.05), 0 18px 80px rgba(33, 212, 253, 0.12)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(0, -18px, 0) scale(1.04)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.8" },
        },
        shimmer: {
          "0%": { transform: "translateX(-140%)" },
          "100%": { transform: "translateX(140%)" },
        },
        alertPulse: {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(123, 241, 255, 0.14)",
          },
          "50%": {
            boxShadow: "0 0 0 14px rgba(123, 241, 255, 0)",
          },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "pulse-glow": "pulseGlow 8s ease-in-out infinite",
        shimmer: "shimmer 3.8s linear infinite",
        "alert-pulse": "alertPulse 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
