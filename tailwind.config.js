// tailwind.config.js
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: ["class"], // toggleable dark mode
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  safelist: [
    {
      pattern: /(bg|text|border)-(green|blue|yellow|orange)-(50|100|200|400|500|600|700|800)/,
    },
  ],

  theme: {
    extend: {
      /* 🎨 Core color system */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /* 🌈 Chart shades (for future analytics) */
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        /* 💜 ReactBits-style emerald theme */
        emerald: {
          950: "#0b0b0f", // page background
          900: "#1a1325", // card background
          800: "#2a1a47", // glow layer
          600: "#8b5cf6", // bright emerald
          400: "#a78bfa",
          300: "#c084fc",
        },
      },

      /* 🔘 Rounded corners for modern card feel */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl2: "1rem", // larger radius for hero cards
      },

      /* ✨ Custom animations */
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        gradient: {
          "0%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
          "100%": { "background-position": "0% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: 0.3 },
          "50%": { opacity: 0.6 },
        },
      },

      animation: {
        fadeUp: "fadeUp 0.6s ease-out",
        gradient: "gradient 8s ease infinite",
        pulseGlow: "pulseGlow 6s ease-in-out infinite",
      },

      /* 💠 Shadow & glass utilities */
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.08)",
        glow: "0 0 25px rgba(139,92,246,0.4)",
        "emerald-glow": "0 0 40px -10px rgba(139,92,246,0.7)",
      },

      backdropBlur: {
        xs: "2px",
      },

      /* 🧠 Font stack (Inter + fallback) */
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};
