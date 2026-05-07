import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kampong: {
          red: "#c8333a",
          ink: "#0f1f30",
        },
      },
    },
  },
  plugins: [],
};

export default config;
