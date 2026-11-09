import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { MotionConfig } from "framer-motion";

import App from "./App";
import { AuthProvider } from "./auth";
import { ToastProvider } from "./components/toast";
import { ThemeProvider } from "./theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* reducedMotion="user": tắt hiệu ứng framer-motion khi hệ điều hành bật giảm chuyển động */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
