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
        yarsi: {
          primary: "#0D7A5F",
          dark: "#075240",
          darker: "#043026",
          light: "#E8F8F5",
          accent: "#10B981",
          muted: "#F0FDF9",
          gold: "#D97706",
          amber: "#F59E0B",
          sky: "#0284C7",
          rose: "#EF4444",
          border: "#D1E7DD",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(13, 122, 95, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        glass: "0 8px 32px 0 rgba(13, 122, 95, 0.12)",
        glow: "0 0 20px rgba(13, 122, 95, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
