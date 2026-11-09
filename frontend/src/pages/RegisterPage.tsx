import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api";
import { useAuth } from "../auth";
import AuthShell from "../components/AuthShell";
import { ErrorText } from "../components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", full_name: "", email: "", password: "", otp: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, email: form.email || null });
      navigate("/profiles");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đăng ký được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Một tài khoản đặt lịch được cho cả bạn và người thân.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" inputMode="tel" pattern="0\d{9}" title="10 số, bắt đầu bằng 0" value={form.phone} onChange={set("phone")} required />
          </div>
          <div>
            <label className="label">Họ và tên</label>
            <input className="input" value={form.full_name} onChange={set("full_name")} required />
          </div>
        </div>
        <div>
          <label className="label">Email (không bắt buộc)</label>
          <input type="email" className="input" value={form.email} onChange={set("email")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Mật khẩu</label>
            <input type="password" minLength={6} className="input" value={form.password} onChange={set("password")} required />
          </div>
          <div>
            <label className="label">Mã OTP</label>
            <input className="input" inputMode="numeric" value={form.otp} onChange={set("otp")} required />
          </div>
        </div>
        <p className="text-xs text-slate-500">Bản demo không gửi SMS, mã OTP là 123456.</p>
        <ErrorText error={error} />
        <button className="btn-primary btn-lg w-full" disabled={busy}>Đăng ký</button>
        <p className="text-center text-sm text-slate-600">
          Đã có tài khoản? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
        </p>
      </form>
    </AuthShell>
  );
}
