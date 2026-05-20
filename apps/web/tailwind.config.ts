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
        brand: {
          navy:        "#0D2137",
          blue:        "#1A3C6E",
          accent:      "#2E86AB",
          gold:        "#F5A623",
          "gold-dark": "#D4891A",
          green:       "#00C896",
          red:         "#FF4D4D",
        },
        surface: {
          bg:     "#F0F4F8",
          card:   "#FFFFFF",
          raised: "#F8FAFC",
          dark:   "#0D2137",
        },
        text: {
          primary:   "#0D2137",
          secondary: "#64748B",
          muted:     "#94A3B8",
          inverse:   "#FFFFFF",
        },
        border: {
          light:  "#E2E8F0",
          medium: "#CBD5E1",
        },
      },
      fontFamily: {
        display: ['"Clash Display"', "ui-sans-serif", "system-ui", "sans-serif"],
        body:    ["Satoshi",         "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm:   "0 1px 3px rgba(13,33,55,0.08), 0 1px 2px rgba(13,33,55,0.04)",
        md:   "0 4px 16px rgba(13,33,55,0.10), 0 2px 6px rgba(13,33,55,0.06)",
        lg:   "0 8px 32px rgba(13,33,55,0.12), 0 4px 12px rgba(13,33,55,0.08)",
        gold: "0 4px 20px rgba(245,166,35,0.30)",
        blue: "0 4px 20px rgba(46,134,171,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
