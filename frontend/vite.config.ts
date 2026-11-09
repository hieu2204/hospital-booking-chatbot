import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api được chuyển tiếp sang backend, nên frontend và backend chung một địa chỉ (không cần CORS)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Thư mục mount từ Windows vào Docker không báo thay đổi file, phải dò định kỳ
    watch: { usePolling: true, interval: 300 },
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
