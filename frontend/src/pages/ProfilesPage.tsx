import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, CreditCard, IdCard, ImagePlus, Pencil, Plus, ShieldCheck, UploadCloud, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "../api";
import { useToast } from "../components/toast";
import { EmptyState, ErrorText, PageHeader, Skeleton } from "../components/ui";
import { initials } from "../format";
import type { Profile } from "../types";

const EMPTY = { full_name: "", dob: "", gender: "Nam", relation: "Bản thân", id_number: "", bhyt_code: "", bhyt_rate: "", phone: "", address: "" };
type FormState = typeof EMPTY;
const EASE = [0.22, 1, 0.36, 1] as const;
const AVATARS = ["from-brand-500 to-brand-700", "from-accent-500 to-accent-700", "from-sky-400 to-brand-600", "from-indigo-400 to-brand-700"];

function ProfileForm({ profile, onDone, onCancel }: { profile: Profile | null; onDone: (message: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormState>(
    profile
      ? { ...EMPTY, full_name: profile.full_name, dob: profile.dob, gender: profile.gender, relation: profile.relation, bhyt_rate: profile.bhyt_rate?.toString() ?? "", phone: profile.phone ?? "", address: profile.address ?? "" }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
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
      onDone(profile ? "Đã cập nhật hồ sơ" : "Đã thêm hồ sơ mới");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được hồ sơ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      onSubmit={submit}
      className="overflow-hidden"
    >
      <div className="card mb-6 border-brand-100 p-6 shadow-ring">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{profile ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</span>
          <h2 className="text-lg font-semibold">{profile ? "Sửa hồ sơ" : "Thêm hồ sơ mới"}</h2>
        </div>
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
                {["Bản thân", "Bố", "Mẹ", "Vợ", "Chồng", "Con", "Khác"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
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
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent-600" /> Số CCCD và số thẻ BHYT được mã hóa khi lưu và không gửi cho trợ lý ảo.
        </p>
        <div className="mt-4">
          <ErrorText error={error} />
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-primary" disabled={busy}>
            Lưu hồ sơ
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Hủy
          </button>
        </div>
      </div>
    </motion.form>
  );
}

/** Ô chọn ảnh có xem trước ngay trên máy, ảnh chưa gửi đi cho tới khi bấm Tải lên. */
function ImagePicker({ label, file, onPick }: { label: string; file: File | null; onPick: (file: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label
      className={`group relative flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed text-center text-sm transition ${
        file ? "border-brand-300" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/40"
      }`}
    >
      {preview ? (
        <>
          <motion.img initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-3 pb-2 pt-6 text-left text-xs font-medium text-white">{label} · bấm để đổi</span>
        </>
      ) : (
        <>
          <ImagePlus className="h-6 w-6 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:text-brand-500" />
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-xs text-slate-500">Chọn ảnh (tối đa 5 MB)</span>
        </>
      )}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

/** BR-22: ảnh CCCD hai mặt, dùng khi khám BHYT trái tuyến. */
function IdImagesForm({ profile, onDone }: { profile: Profile; onDone: (message: string) => void }) {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const form = new FormData();
    form.append("front", front!);
    form.append("back", back!);
    setBusy(true);
    try {
      await api(`/profiles/${profile.id}/id-images`, { form });
      onDone("Đã tải ảnh CCCD lên");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải ảnh lên được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
      <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ImagePicker label="Mặt trước CCCD" file={front} onPick={setFront} />
          <ImagePicker label="Mặt sau CCCD" file={back} onPick={setBack} />
        </div>
        <ErrorText error={error} />
        <button className="btn-primary" disabled={!front || !back || busy} onClick={upload}>
          <UploadCloud className="h-4 w-4" /> Tải ảnh lên
        </button>
      </div>
    </motion.div>
  );
}

function Item({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${ok ? "bg-accent-50 text-accent-600" : "bg-slate-100 text-slate-400"}`}>{icon}</span>
      <span className="text-slate-500">{label}</span>
      <span className={`ml-auto font-medium ${ok ? "text-slate-800" : "text-slate-400"}`}>{value}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-7" />
      ))}
    </div>
  );
}

export default function ProfilesPage() {
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const load = useCallback(() => void api<Profile[]>("/profiles").then(setProfiles), []);
  useEffect(load, [load]);

  const done = (message: string) => {
    setEditing(null);
    setUploading(null);
    toast(message);
    load();
  };

  const openForm = (value: Profile | "new") => {
    setEditing(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Hồ sơ người bệnh"
        subtitle="Một tài khoản quản lý hồ sơ cho bản thân và người thân."
        action={
          editing === null && (
            <button className="btn-primary shadow-glow" onClick={() => openForm("new")}>
              <Plus className="h-4 w-4" /> Thêm hồ sơ
            </button>
          )
        }
      />
      <AnimatePresence initial={false}>
        {editing !== null && (
          <ProfileForm key={editing === "new" ? "new" : editing.id} profile={editing === "new" ? null : editing} onDone={done} onCancel={() => setEditing(null)} />
        )}
      </AnimatePresence>

      {profiles === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileSkeleton />
          <ProfileSkeleton />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-6 w-6" />}
          title="Chưa có hồ sơ người bệnh"
          text="Tạo hồ sơ để đặt lịch khám cho bạn hoặc người thân."
          action={
            editing === null && (
              <button className="btn-primary" onClick={() => openForm("new")}>
                <Plus className="h-4 w-4" /> Tạo hồ sơ đầu tiên
              </button>
            )
          }
        />
      ) : (
        <motion.div className="grid gap-4 md:grid-cols-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              layout
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              className={`card p-6 transition-shadow hover:shadow-ring ${editing !== "new" && editing?.id === profile.id ? "ring-4 ring-brand-100" : ""}`}
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white ${AVATARS[index % AVATARS.length]}`}>
                  {initials(profile.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{profile.full_name}</p>
                  <p className="text-sm text-slate-500">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{profile.relation}</span> · {profile.gender} ·{" "}
                    {new Date(profile.dob).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <button className="btn-ghost px-2.5" title="Sửa hồ sơ" onClick={() => openForm(profile)}>
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                <Item icon={<IdCard className="h-4 w-4" />} label="CCCD" value={profile.id_number_masked ?? "Chưa có"} ok={Boolean(profile.id_number_masked)} />
                <Item
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Thẻ BHYT"
                  value={profile.bhyt_code_masked ? `${profile.bhyt_code_masked} · ${profile.bhyt_rate}%` : "Chưa có"}
                  ok={Boolean(profile.bhyt_code_masked)}
                />
                <Item icon={<BadgeCheck className="h-4 w-4" />} label="Ảnh CCCD (trái tuyến)" value={profile.has_id_images ? "Đã tải lên" : "Chưa có"} ok={profile.has_id_images} />
              </div>
              <button className="mt-4 text-sm font-semibold text-brand-600 hover:underline" onClick={() => setUploading(uploading === profile.id ? null : profile.id)}>
                {uploading === profile.id ? "Đóng" : profile.has_id_images ? "Tải lại ảnh CCCD" : "Tải ảnh CCCD"}
              </button>
              <AnimatePresence initial={false}>{uploading === profile.id && <IdImagesForm key="upload" profile={profile} onDone={done} />}</AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
