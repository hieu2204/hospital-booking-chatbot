/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"],
      },
      colors: {
        // Xanh y tế: màu chính cho nút, liên kết, phần nhấn mạnh
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#4f9bf0",
          500: "#1f7ae0",
          600: "#0b63ce",
          700: "#0a51a8",
          800: "#0d4385",
          900: "#0f2f5c",
        },
        // Xanh ngọc: màu phụ cho trạng thái tích cực và điểm nhấn nhẹ
        accent: {
          50: "#effcf9",
          100: "#d1f7ef",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 47, 92, 0.04), 0 4px 16px rgba(15, 47, 92, 0.06)",
        lift: "0 8px 30px rgba(15, 47, 92, 0.12)",
        glow: "0 10px 40px -10px rgba(11, 99, 206, 0.45)",
        ring: "0 0 0 1px rgba(15, 47, 92, 0.06), 0 20px 50px -12px rgba(15, 47, 92, 0.18)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.08)" },
          "66%": { transform: "translate(-25px, 20px) scale(0.95)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        float: "float 18s ease-in-out infinite",
        "float-slow": "float 26s ease-in-out infinite reverse",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        marquee: "marquee 40s linear infinite",
      },
      backgroundImage: {
        dots: "radial-gradient(rgba(11, 99, 206, 0.12) 1px, transparent 1px)",
        grid: "linear-gradient(rgba(15, 47, 92, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 47, 92, 0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        dots: "18px 18px",
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};
