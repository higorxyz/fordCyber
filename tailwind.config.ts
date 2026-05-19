import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ford: {
          black: "#000000",
          blue: "#003478",
          "blue-light": "#0068D6",
          red: "#C41E3A",
          "red-dark": "#8B0000",
          gray: "#1A1A1A",
          "gray-mid": "#2D2D2D",
        },
      },
      fontFamily: {
        sans: ['"Archivo"', "system-ui", "sans-serif"],
        display: ['"Chakra Petch"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-ford": "pulseFord 1.5s ease-in-out infinite",
        "ecg": "ecg 2s linear infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "flow": "flow 3s linear infinite",
      },
      keyframes: {
        pulseFord: {
          "0%, 100%": {
            transform: "scale(1)",
            textShadow: "0 0 20px rgba(196,30,58,0.6), 0 0 40px rgba(196,30,58,0.3)",
          },
          "50%": {
            transform: "scale(1.05)",
            textShadow: "0 0 40px rgba(196,30,58,1), 0 0 80px rgba(196,30,58,0.6), 0 0 120px rgba(196,30,58,0.4)",
          },
        },
        ecg: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.6" },
        },
        flow: {
          "0%": { strokeDashoffset: "20" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
