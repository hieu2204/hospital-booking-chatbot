import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api";
import { useAuth } from "../auth";
import AuthShell from "../components/AuthShell";
import { ErrorText } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
      navigate(params.get("next") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đăng nhập được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Đăng nhập" subtitle="Đăng nhập để đặt lịch, xem phiếu khám và quản lý hồ sơ người bệnh.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="phone">Số điện thoại</label>
          <input id="phone" className="input" inputMode="tel" placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <ErrorText error={error} />
        <button className="btn-primary btn-lg w-full" disabled={busy}>Đăng nhập</button>
        <p className="text-center text-sm text-slate-600">
          Chưa có tài khoản? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Đăng ký ngay</Link>
        </p>
      </form>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Tài khoản demo</p>
        <p className="mt-1">Bệnh nhân: <span className="font-mono">0900000002</span> · mật khẩu <span className="font-mono">demo1234</span></p>
      </div>
    </AuthShell>
  );
}
