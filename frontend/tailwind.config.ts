import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#070a12",
        surface: "#0f172a",
        surfaceHover: "#1e293b",
      },
      animation: {
        "float-slow": "float-slow 10s ease-in-out infinite",
        "float-reverse": "float-reverse 12s ease-in-out infinite",
        "pulse-glow": "pulse-glow 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
