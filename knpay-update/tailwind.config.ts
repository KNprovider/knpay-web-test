import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        knpay: {
          bg: "#141414",
          panel: "#181818",
          border: "#2a2a2a",
          text: "#E5E7EB",
          muted: "#9CA3AF",
          // Turquoise sampled from the design reference
          accent: "#08ddf0",
          "accent-dark": "#067e92",
          "accent-light": "#0fefef",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
