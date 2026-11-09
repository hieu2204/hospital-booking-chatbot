import { motion } from "framer-motion";
import { KeyRound, Loader2, LockKeyhole, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorText, IconInput, PasswordInput } from "../components/ui";
import type { User } from "../types";

/** Trang đăng nhập riêng cho quản trị viên. */
export default function AdminLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(phone, password);
      const me = await api<User>("/auth/me");
      if (me.role !== "admin") {
        logout();
        setError("Tài khoản này không có quyền quản trị");
        return;
      }
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đăng nhập được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-float rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 animate-float-slow rounded-full bg-accent-500/20 blur-3xl" />
      <motion.form
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Quản trị hệ thống</h1>
        <p className="mt-1 text-sm text-slate-500">Bệnh viện Demo · dành cho nhân viên vận hành</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Số điện thoại</label>
            <IconInput icon={<Phone className="h-4 w-4" />} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <PasswordInput icon={<KeyRound className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <ErrorText error={error} />
          <button className="btn btn-lg w-full bg-slate-900 text-white hover:bg-slate-800" disabled={busy}>
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} Đăng nhập
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Demo: 0900000001 · demo1234</p>
      </motion.form>
    </div>
  );
}
