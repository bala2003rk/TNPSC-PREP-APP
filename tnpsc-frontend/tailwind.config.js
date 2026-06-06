/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF6B35",
          50:  "#fff4ef",
          100: "#ffe6d9",
          200: "#ffcbb3",
          300: "#ffa37d",
          400: "#ff7a47",
          500: "#FF6B35",
          600: "#e84d14",
          700: "#c33b0f",
          800: "#9c3114",
          900: "#7e2c14",
        },
        secondary: {
          DEFAULT: "#2D6A4F",
          50:  "#f0faf4",
          100: "#dcf4e6",
          200: "#bbe8ce",
          300: "#88d4ad",
          400: "#52b884",
          500: "#2D6A4F",
          600: "#236050",
          700: "#1d4d40",
          800: "#183d33",
          900: "#14322b",
        },
        accent: {
          DEFAULT: "#FFB627",
          50:  "#fffbeb",
          100: "#fff3c7",
          200: "#ffe589",
          300: "#ffd04c",
          400: "#FFB627",
          500: "#f99b07",
          600: "#dd7602",
          700: "#b75406",
          800: "#94410c",
          900: "#79360d",
        },
        dark: {
          DEFAULT: "#1A1A2E",
          50:  "#f0f0f8",
          100: "#ddddef",
          200: "#c0bed8",
          300: "#9896bb",
          400: "#716e9e",
          500: "#555283",
          600: "#433f6a",
          700: "#363256",
          800: "#2c2947",
          900: "#1A1A2E",
        },
      },
      fontFamily: {
        sans:  ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        tamil: ["Noto Sans Tamil", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glow-primary": "0 0 24px rgba(255, 107, 53, 0.35)",
        "glow-accent":  "0 0 24px rgba(255, 182, 39, 0.35)",
      },
      borderOpacity: {
        8:  "0.08",
        12: "0.12",
        15: "0.15",
      },
    },
  },
  plugins: [],
};
