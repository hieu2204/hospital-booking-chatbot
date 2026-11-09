import { Check, Info, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api, ApiError } from "../api";
import DepartmentIcon from "../components/DepartmentIcon";
import SlotPicker from "../components/SlotPicker";
import { Countdown, ErrorText, Row } from "../components/ui";
import { dateTime, money, PAYER_LABEL, WARNING_LABEL } from "../format";
import type { Appointment, BookingResult, Department, Doctor, PayerType, Profile, ServiceType, Slot } from "../types";

type Mode = "department" | "doctor";
const STEPS = ["Dịch vụ", "Ngày giờ", "Thông tin", "Thanh toán"];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                done ? "bg-brand-600 text-white" : active ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`hidden text-sm font-medium sm:block ${active || done ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            {index < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${done ? "bg-brand-600" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** UC-03: đặt lịch bằng form, theo chuyên khoa hoặc theo bác sĩ (BR-12b, BR-13). */
export default function BookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>("department");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [departmentId, setDepartmentId] = useState<number | null>(Number(params.get("department")) || null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [payer, setPayer] = useState<PayerType>("none");
  const [referralExpiry, setReferralExpiry] = useState("");
  const [consent, setConsent] = useState(false);
  const [symptoms, setSymptoms] = useState("");

  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<Department[]>("/departments").then(setDepartments);
    void api<ServiceType[]>("/service-types").then((items) => {
      setServices(items);
      setServiceId(items[0]?.id ?? null);
    });
    void api<Profile[]>("/profiles").then((items) => {
      setProfiles(items);
      setProfileId(items[0]?.id ?? null);
    });
    void api<Doctor[]>("/doctors").then(setDoctors);
  }, []);

  const service = services.find((item) => item.id === serviceId);
  const profile = profiles.find((item) => item.id === profileId);
  const department = departments.find((item) => item.id === departmentId);
  const doctor = doctors.find((item) => item.id === doctorId);
  const departmentDoctors = useMemo(() => doctors.filter((d) => d.department_id === departmentId), [doctors, departmentId]);

  useEffect(() => setSlot(null), [departmentId, serviceId, doctorId]);
  useEffect(() => {
    if (payer.startsWith("bhyt") && (!service?.allow_bhyt || !profile?.bhyt_code_masked)) setPayer("none");
  }, [service, profile, payer]);

  const step = result ? 3 : slot ? 2 : departmentId && serviceId ? 1 : 0;

  const submit = async () => {
    if (!slot || !profileId) return;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api<BookingResult>("/appointments", {
          body: {
            profile_id: profileId,
            session_id: slot.session_id,
            slot_time: slot.slot_time,
            payer_type: payer,
            referral_expiry: payer === "bhyt_dung_tuyen" && referralExpiry ? referralExpiry : null,
            symptoms: symptoms || null,
            bhyt_consent: consent,
          },
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đặt được lịch");
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const paid = await api<Appointment>(`/appointments/${result!.appointment.id}/pay`, { method: "POST" });
      navigate(`/appointments/${paid.id}/ticket`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thanh toán được");
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <aside className="card h-fit p-6 lg:sticky lg:top-24">
      <h2 className="font-semibold">Thông tin đặt lịch</h2>
      <div className="mt-4 divide-y divide-slate-100">
        <Row label="Chuyên khoa">{department?.name ?? "–"}</Row>
        <Row label="Hình thức">{service?.name ?? "–"}</Row>
        <Row label="Bác sĩ">{slot?.doctor_name ?? (doctor ? `${doctor.title} ${doctor.full_name}` : "–")}</Row>
        <Row label="Thời gian">{slot ? dateTime(slot.slot_time) : "–"}</Row>
        <Row label="Phòng">{slot?.room ?? "–"}</Row>
        <Row label="Người khám">{profile?.full_name ?? "–"}</Row>
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
        <span className="text-sm text-slate-500">Phí khám</span>
        <span className="text-xl font-bold text-brand-700">{slot ? money(slot.price) : "–"}</span>
      </div>
    </aside>
  );

  if (result) {
    const a = result.appointment;
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Stepper current={3} />
        <div className="mx-auto max-w-lg">
          <div className="card p-6">
            <h1 className="text-xl font-bold">Thanh toán để hoàn tất</h1>
            <p className="mt-1 text-sm text-slate-500">
              Lịch đang được giữ chỗ trong <Countdown until={a.hold_expires_at!} />. Quá thời gian này lịch sẽ tự hủy.
            </p>
            <div className="mt-5 divide-y divide-slate-100">
              <Row label="Mã lịch">{a.code}</Row>
              <Row label="Người khám">{a.patient_name}</Row>
              <Row label="Khoa">{a.department}</Row>
              <Row label="Bác sĩ">{a.doctor_name}</Row>
              <Row label="Thời gian">{dateTime(a.slot_time)}</Row>
              <Row label="Đối tượng">{PAYER_LABEL[a.payer_type]}</Row>
            </div>
            {result.warnings.map((code) => (
              <p key={code} className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{WARNING_LABEL[code] ?? code}</p>
            ))}
            <div className="mt-5 flex items-baseline justify-between border-t border-slate-200 pt-4">
              <span className="text-slate-500">Tổng cộng</span>
              <span className="text-2xl font-bold text-brand-700">{money(a.price)}</span>
            </div>
            <div className="mt-4"><ErrorText error={error} /></div>
            <button className="btn-primary btn-lg mt-4 w-full" disabled={busy} onClick={pay}>
              Thanh toán (giả lập)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Đặt lịch khám</h1>
      <p className="mb-8 mt-1.5 text-slate-500">Chọn chuyên khoa hoặc bác sĩ, chọn giờ còn trống rồi xác nhận thông tin.</p>
      <Stepper current={step} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Section title="1. Chọn dịch vụ">
            <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
              {(["department", "doctor"] as Mode[]).map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setMode(value);
                    setDoctorId(null);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {value === "department" ? "Theo chuyên khoa" : "Theo bác sĩ"}
                </button>
              ))}
            </div>

            {mode === "department" ? (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {departments.map((dept) => {
                  const active = dept.id === departmentId;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setDepartmentId(dept.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"}`}>
                        <DepartmentIcon name={dept.name} className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-medium text-slate-900">{dept.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                className="input"
                value={doctorId ?? ""}
                onChange={(event) => {
                  const picked = doctors.find((d) => d.id === Number(event.target.value));
                  setDoctorId(picked?.id ?? null);
                  setDepartmentId(picked?.department_id ?? null);
                }}
              >
                <option value="">Chọn bác sĩ</option>
                {departments.map((dept) => (
                  <optgroup key={dept.id} label={dept.name}>
                    {doctors.filter((d) => d.department_id === dept.id).map((d) => (
                      <option key={d.id} value={d.id}>{d.title} {d.full_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            <p className="label mt-6">Hình thức khám</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {services.map((item) => {
                const active = item.id === serviceId;
                return (
                  <label key={item.id} className={`cursor-pointer rounded-xl border p-3.5 transition ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300"}`}>
                    <input type="radio" className="sr-only" checked={active} onChange={() => setServiceId(item.id)} />
                    <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${item.allow_bhyt ? "bg-accent-50 text-accent-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.allow_bhyt ? "Nhận BHYT" : "Không áp dụng BHYT"}
                    </span>
                  </label>
                );
              })}
            </div>

            {mode === "department" && departmentId && service?.choose_doctor && departmentDoctors.length > 0 && (
              <div className="mt-5">
                <label className="label">Bác sĩ (không bắt buộc)</label>
                <select className="input" value={doctorId ?? ""} onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Bác sĩ nào cũng được</option>
                  {departmentDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} {d.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </Section>

          {departmentId && serviceId && (
            <Section title="2. Chọn ngày giờ" hint="Đặt trước từ 1 đến 30 ngày. Lịch ngày mai phải đặt trước 16:30 hôm nay.">
              <SlotPicker departmentId={departmentId} doctorId={doctorId} serviceTypeId={serviceId} selected={slot} onSelect={setSlot} />
            </Section>
          )}

          {slot && (
            <Section title="3. Thông tin người khám">
              {profiles.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
                  <UserRound className="h-5 w-5" />
                  Bạn chưa có hồ sơ người bệnh.{" "}
                  <Link to="/profiles" className="font-semibold underline">Tạo hồ sơ</Link>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="label">Hồ sơ người bệnh</label>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {profiles.map((p) => (
                        <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${p.id === profileId ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200"}`}>
                          <input type="radio" className="sr-only" checked={p.id === profileId} onChange={() => setProfileId(p.id)} />
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700 shadow-sm">{p.full_name.split(" ").slice(-1)[0]?.charAt(0)}</span>
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">{p.full_name}</span>
                            <span className="block text-xs text-slate-500">{p.relation}{p.bhyt_code_masked ? " · có thẻ BHYT" : ""}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="label">Đối tượng thanh toán</span>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {(Object.keys(PAYER_LABEL) as PayerType[]).map((value) => {
                        const disabled = value.startsWith("bhyt") && (!service?.allow_bhyt || !profile?.bhyt_code_masked);
                        return (
                          <label key={value} className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${payer === value ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                            <input type="radio" className="accent-brand-600" disabled={disabled} checked={payer === value} onChange={() => setPayer(value)} />
                            {PAYER_LABEL[value]}
                          </label>
                        );
                      })}
                    </div>
                    {!profile?.bhyt_code_masked && service?.allow_bhyt && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <Info className="h-3.5 w-3.5" /> Hồ sơ chưa có số thẻ BHYT, cập nhật ở trang Hồ sơ để dùng BHYT.
                      </p>
                    )}
                  </div>

                  {payer === "bhyt_dung_tuyen" && (
                    <div>
                      <label className="label">Hạn giấy chuyển tuyến (nếu có)</label>
                      <input type="date" className="input max-w-xs" value={referralExpiry} onChange={(e) => setReferralExpiry(e.target.value)} />
                    </div>
                  )}

                  {payer === "bhyt_trai_tuyen" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p>Khám trái tuyến: BHYT chi trả 50% mức hưởng của thẻ. Cần ảnh CCCD hai mặt trong hồ sơ.</p>
                      {!profile?.has_id_images && (
                        <p className="mt-1">Hồ sơ chưa có ảnh CCCD. <Link to="/profiles" className="font-semibold underline">Tải ảnh ở trang Hồ sơ</Link>.</p>
                      )}
                      <label className="mt-3 flex items-center gap-2 font-medium">
                        <input type="checkbox" className="accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                        Tôi đồng ý cam kết khám BHYT trái tuyến
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="label">Triệu chứng (không bắt buộc)</label>
                    <textarea className="input" rows={2} placeholder="Ví dụ: đau thượng vị, ợ chua 1 tuần nay" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                  </div>
                  <ErrorText error={error} />
                  <button className="btn-primary btn-lg w-full" disabled={busy} onClick={submit}>Xác nhận đặt lịch</button>
                </div>
              )}
            </Section>
          )}
        </div>
        {summary}
      </div>
    </div>
  );
}
