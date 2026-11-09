import { Route, Routes } from "react-router-dom";

import AdminAppointmentsPage from "./admin/AdminAppointmentsPage";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLayout from "./admin/AdminLayout";
import AdminLoginPage from "./admin/AdminLoginPage";
import AdminSessionsPage from "./admin/AdminSessionsPage";
import AdminSystemPage from "./admin/AdminSystemPage";
import { RequireAuth } from "./auth";
import { ChatProvider } from "./chat";
import PublicLayout from "./components/PublicLayout";
import AppointmentsPage from "./pages/AppointmentsPage";
import BookingPage from "./pages/BookingPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilesPage from "./pages/ProfilesPage";
import RegisterPage from "./pages/RegisterPage";
import TicketPage from "./pages/TicketPage";

export default function App() {
  return (
    <Routes>
      {/* Khu vực quản trị: layout và trang đăng nhập riêng, không có trợ lý ảo */}
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="sessions" element={<AdminSessionsPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="system" element={<AdminSystemPage />} />
      </Route>

      {/* Khu vực người bệnh: website kèm trợ lý ảo dạng bong bóng */}
      <Route element={<ChatProvider><PublicLayout /></ChatProvider>}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="booking" element={<RequireAuth><BookingPage /></RequireAuth>} />
        <Route path="appointments" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
        <Route path="appointments/:id/ticket" element={<RequireAuth><TicketPage /></RequireAuth>} />
        <Route path="profiles" element={<RequireAuth><ProfilesPage /></RequireAuth>} />
        <Route path="*" element={<p className="py-24 text-center text-slate-500">Không tìm thấy trang.</p>} />
      </Route>
    </Routes>
  );
}
