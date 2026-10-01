import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#070504",
        espresso: "#0D0906",
        umber: "#150F0A",
        roast: "#1F1610",
        "roast-light": "#2B1F17",
        gold: {
          DEFAULT: "#D4A853",
          light: "#E8C67A",
          bright: "#F3D87D",
          muted: "#9E7832",
          bronze: "#6E3E1E",
          deep: "#4A2810",
        },
        crema: "#F7F2E9",
        champagne: "#BCA995",
        taupe: "#82705E",
        sage: {
          DEFAULT: "#4E9F72",
          light: "#6FC293",
          bg: "#12241A",
        },
        saffron: {
          DEFAULT: "#DC9E28",
          light: "#F0B849",
          bg: "#281C08",
        },
        terracotta: {
          DEFAULT: "#C94A32",
          light: "#E56B54",
          bg: "#28110D",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        luxury: "0 20px 50px -15px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(212, 168, 83, 0.14)",
        "luxury-hover": "0 24px 60px -12px rgba(0, 0, 0, 0.92), 0 0 1px 1px rgba(212, 168, 83, 0.32)",
        "gold-glow": "0 0 40px -10px rgba(212, 168, 83, 0.22)",
      },
      keyframes: {
        "light-sweep": {
          "0%": { transform: "translateX(-120%) rotate(25deg)", opacity: "0" },
          "40%": { opacity: "0.55" },
          "100%": { transform: "translateX(140%) rotate(25deg)", opacity: "0" },
        },
        "ambient-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.32" },
          "50%": { transform: "scale(1.08)", opacity: "0.48" },
        },
      },
      animation: {
        "light-sweep": "light-sweep 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "ambient-breathe": "ambient-breathe 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
