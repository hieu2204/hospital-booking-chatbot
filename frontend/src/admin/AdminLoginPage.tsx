import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorText } from "../components/ui";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lift">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Quản trị hệ thống</h1>
        <p className="mt-1 text-sm text-slate-500">Bệnh viện Demo · dành cho nhân viên vận hành</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <ErrorText error={error} />
          <button className="btn btn-lg w-full bg-slate-900 text-white hover:bg-slate-800" disabled={busy}>Đăng nhập</button>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Demo: 0900000001 · demo1234</p>
      </form>
    </div>
  );
}
