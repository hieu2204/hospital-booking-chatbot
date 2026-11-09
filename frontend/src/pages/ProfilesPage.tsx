import { BadgeCheck, CreditCard, IdCard, Pencil, Plus, UploadCloud, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "../api";
import { EmptyState, ErrorText, PageHeader, Spinner } from "../components/ui";
import type { Profile } from "../types";

const EMPTY = { full_name: "", dob: "", gender: "Nam", relation: "Bản thân", id_number: "", bhyt_code: "", bhyt_rate: "", phone: "", address: "" };
type FormState = typeof EMPTY;

function ProfileForm({ profile, onDone }: { profile: Profile | null; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(
    profile
      ? { ...EMPTY, full_name: profile.full_name, dob: profile.dob, gender: profile.gender, relation: profile.relation, bhyt_rate: profile.bhyt_rate?.toString() ?? "", phone: profile.phone ?? "", address: profile.address ?? "" }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const body = {
      full_name: form.full_name,
      dob: form.dob,
      gender: form.gender,
      relation: form.relation,
      id_number: form.id_number || null,
      bhyt_code: form.bhyt_code || null,
      bhyt_rate: form.bhyt_rate ? Number(form.bhyt_rate) : null,
      phone: form.phone || null,
      address: form.address || null,
    };
    try {
      await api(profile ? `/profiles/${profile.id}` : "/profiles", { method: profile ? "PATCH" : "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được hồ sơ");
    }
  };

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold">{profile ? "Sửa hồ sơ" : "Thêm hồ sơ mới"}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Họ và tên</label>
          <input className="input" value={form.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <label className="label">Ngày sinh</label>
          <input type="date" className="input" value={form.dob} onChange={set("dob")} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Giới tính</label>
            <select className="input" value={form.gender} onChange={set("gender")}>
              <option>Nam</option>
              <option>Nữ</option>
            </select>
          </div>
          <div>
            <label className="label">Quan hệ</label>
            <select className="input" value={form.relation} onChange={set("relation")}>
              {["Bản thân", "Bố", "Mẹ", "Vợ", "Chồng", "Con", "Khác"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Số CCCD</label>
          <input className="input" inputMode="numeric" value={form.id_number} onChange={set("id_number")} placeholder={profile?.id_number_masked ? `Đang lưu ${profile.id_number_masked}, để trống nếu không đổi` : ""} />
        </div>
        <div>
          <label className="label">Số thẻ BHYT</label>
          <input className="input" value={form.bhyt_code} onChange={set("bhyt_code")} placeholder={profile?.bhyt_code_masked ? `Đang lưu ${profile.bhyt_code_masked}, để trống nếu không đổi` : ""} />
        </div>
        <div>
          <label className="label">Mức hưởng BHYT</label>
          <select className="input" value={form.bhyt_rate} onChange={set("bhyt_rate")}>
            <option value="">Không có</option>
            <option value="100">100%</option>
            <option value="95">95%</option>
            <option value="80">80%</option>
          </select>
        </div>
        <div>
          <label className="label">Số điện thoại</label>
          <input className="input" inputMode="tel" pattern="0\d{9}" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Địa chỉ</label>
          <input className="input" value={form.address} onChange={set("address")} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">Số CCCD và số thẻ BHYT được mã hóa khi lưu và không gửi cho trợ lý ảo.</p>
      <div className="mt-4"><ErrorText error={error} /></div>
      <div className="mt-5 flex gap-2">
        <button className="btn-primary">Lưu hồ sơ</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Hủy</button>
      </div>
    </form>
  );
}

/** BR-22: ảnh CCCD hai mặt, dùng khi khám BHYT trái tuyến. */
function IdImagesForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    const form = new FormData();
    form.append("front", front!);
    form.append("back", back!);
    try {
      await api(`/profiles/${profile.id}/id-images`, { form });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải ảnh lên được");
    }
  };

  const picker = (label: string, file: File | null, onPick: (file: File | null) => void) => (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-sm hover:border-brand-300">
      <UploadCloud className="h-5 w-5 text-slate-400" />
      <span className="font-medium text-slate-700">{label}</span>
      <span className="max-w-full truncate text-xs text-slate-500">{file?.name ?? "Chọn ảnh (tối đa 5 MB)"}</span>
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {picker("Mặt trước CCCD", front, setFront)}
        {picker("Mặt sau CCCD", back, setBack)}
      </div>
      <ErrorText error={error} />
      <button className="btn-primary" disabled={!front || !back} onClick={upload}>Tải ảnh lên</button>
    </div>
  );
}

function Item({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className={ok ? "text-accent-600" : "text-slate-400"}>{icon}</span>
      <span className="text-slate-500">{label}</span>
      <span className="ml-auto font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const load = useCallback(() => void api<Profile[]>("/profiles").then(setProfiles), []);
  useEffect(load, [load]);

  const done = () => {
    setEditing(null);
    setUploading(null);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Hồ sơ người bệnh"
        subtitle="Một tài khoản quản lý hồ sơ cho bản thân và người thân."
        action={editing === null && <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Thêm hồ sơ</button>}
      />
      {editing !== null && <div className="mb-6"><ProfileForm profile={editing === "new" ? null : editing} onDone={done} /></div>}
      {profiles === null ? (
        <Spinner />
      ) : profiles.length === 0 ? (
        <EmptyState icon={<UserRound className="h-6 w-6" />} title="Chưa có hồ sơ người bệnh" text="Tạo hồ sơ để đặt lịch khám cho bạn hoặc người thân." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="card p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {profile.full_name.split(" ").slice(-1)[0]?.charAt(0)}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{profile.full_name}</p>
                  <p className="text-sm text-slate-500">{profile.relation} · {profile.gender} · {new Date(profile.dob).toLocaleDateString("vi-VN")}</p>
                </div>
                <button className="btn-ghost px-2.5" title="Sửa hồ sơ" onClick={() => setEditing(profile)}>
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                <Item icon={<IdCard className="h-4 w-4" />} label="CCCD" value={profile.id_number_masked ?? "Chưa có"} ok={Boolean(profile.id_number_masked)} />
                <Item icon={<CreditCard className="h-4 w-4" />} label="Thẻ BHYT" value={profile.bhyt_code_masked ? `${profile.bhyt_code_masked} · ${profile.bhyt_rate}%` : "Chưa có"} ok={Boolean(profile.bhyt_code_masked)} />
                <Item icon={<BadgeCheck className="h-4 w-4" />} label="Ảnh CCCD (trái tuyến)" value={profile.has_id_images ? "Đã tải lên" : "Chưa có"} ok={profile.has_id_images} />
              </div>
              <button className="mt-4 text-sm font-semibold text-brand-600 hover:underline" onClick={() => setUploading(uploading === profile.id ? null : profile.id)}>
                {profile.has_id_images ? "Tải lại ảnh CCCD" : "Tải ảnh CCCD"}
              </button>
              {uploading === profile.id && <IdImagesForm profile={profile} onDone={done} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
