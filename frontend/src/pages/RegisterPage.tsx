import { KeyRound, Loader2, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api";
import { useAuth } from "../auth";
import AuthShell from "../components/AuthShell";
import { useToast } from "../components/toast";
import { ErrorText, IconInput, PasswordInput } from "../components/ui";

/** Độ mạnh mật khẩu đơn giản: độ dài, có số, có chữ hoa hoặc ký tự đặc biệt. */
function strength(password: string): number {
  if (!password) return 0;
  let score = password.length >= 6 ? 1 : 0;
  if (password.length >= 10) score++;
  if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH = [
  { label: "", color: "bg-slate-200" },
  { label: "Yếu", color: "bg-rose-500" },
  { label: "Trung bình", color: "bg-amber-500" },
  { label: "Khá", color: "bg-brand-500" },
  { label: "Mạnh", color: "bg-emerald-500" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ phone: "", full_name: "", email: "", password: "", otp: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  const score = strength(form.password);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, email: form.email || null });
      toast("Tạo tài khoản thành công. Hãy thêm hồ sơ người bệnh để đặt lịch.");
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
        <div>
          <label className="label">Số điện thoại</label>
          <IconInput icon={<Phone className="h-4 w-4" />} inputMode="tel" pattern="0\d{9}" title="10 số, bắt đầu bằng 0" value={form.phone} onChange={set("phone")} required />
        </div>
        <div>
          <label className="label">Họ và tên</label>
          <IconInput icon={<UserRound className="h-4 w-4" />} value={form.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <label className="label">Email (không bắt buộc)</label>
          <IconInput icon={<Mail className="h-4 w-4" />} type="email" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Mật khẩu</label>
          <PasswordInput icon={<KeyRound className="h-4 w-4" />} minLength={6} value={form.password} onChange={set("password")} required />
          <div className="mt-2 flex items-center gap-2">
            <div className="grid flex-1 grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((level) => (
                <span key={level} className={`h-1.5 rounded-full transition-colors duration-300 ${score >= level ? STRENGTH[score].color : "bg-slate-200"}`} />
              ))}
            </div>
            <span className="w-20 text-right text-xs text-slate-500">{STRENGTH[score].label}</span>
          </div>
        </div>
        <div>
          <label className="label">Mã OTP</label>
          <IconInput icon={<MessageSquareText className="h-4 w-4" />} inputMode="numeric" maxLength={6} className="tracking-[0.4em]" value={form.otp} onChange={set("otp")} required />
          <p className="mt-1.5 text-xs text-slate-500">Bản demo không gửi SMS, mã OTP là 123456.</p>
        </div>
        <ErrorText error={error} />
        <button className="btn-primary btn-lg w-full shadow-glow" disabled={busy}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Đăng ký
        </button>
        <p className="text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
