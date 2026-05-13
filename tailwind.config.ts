import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a1929", // Deep navy
        surface: "#0f1f30", // Premium dark leather/willow feel
        border: {
          DEFAULT: "rgba(245, 240, 232, 0.08)",
          hover: "rgba(245, 240, 232, 0.16)",
        },
        foreground: {
          DEFAULT: "#f5f0e8", // Warm off-white
          muted: "rgba(245, 240, 232, 0.6)",
        },
        crimson: {
          DEFAULT: "#c8333a", // Cricket-ball crimson
          50: "#fdf3f4",
          100: "#fbe4e6",
          200: "#f6cfd2",
          300: "#efadb3",
          400: "#e47f89",
          500: "#d55462",
          600: "#c8333a", // Base
          700: "#aa252d",
          800: "#8e2229",
          900: "#762228",
          950: "#602125",
        },
        success: {
          DEFAULT: "#10b981",
          muted: "rgba(16, 185, 129, 0.2)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          muted: "rgba(245, 158, 11, 0.2)",
        },
        danger: {
          DEFAULT: "#ef4444",
          muted: "rgba(239, 68, 68, 0.2)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "spin-seam": "spin-seam 1.2s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "spin-seam": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
