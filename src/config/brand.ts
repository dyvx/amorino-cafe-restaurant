/**
 * AMORINO CAFE & RESTAURANT — CENTRALIZED BRAND CONFIGURATION
 *
 * STRICT LOGO RULE:
 * Uses the exact official Amorino logo PNG throughout the entire application.
 * Never redesign, redraw, stretch, rotate, or replace with generated text.
 */

export const BRAND_CONFIG = {
  name: "Amorino Cafe & Restaurant",
  shortName: "Amorino Café",
  country: "Kenya",
  // Official logo URL provided in Master Build Prompt Section 0
  officialLogoUrl: "https://i.postimg.cc/DyXtfw9v/logo1111.png",
  // Local exact mirror in public/ for instant offline/PWA & zero-latency loading
  localLogoPath: "/logo1111.png",
  defaultCurrency: "KES",
  palette: {
    obsidian: "#070504",
    espresso: "#0D0906",
    umber: "#150F0A",
    roast: "#1F1610",
    gold: "#D4A853",
    goldLight: "#E8C67A",
    goldBronze: "#6E3E1E",
    crema: "#F7F2E9",
    champagne: "#BCA995",
    taupe: "#82705E",
  },
} as const;
