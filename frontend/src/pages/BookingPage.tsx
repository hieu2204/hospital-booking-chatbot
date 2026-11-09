import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarDays, Check, CreditCard, Info, Lock, Search, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api, ApiError } from "../api";
import DepartmentIcon from "../components/DepartmentIcon";
import SlotPicker from "../components/SlotPicker";
import { Countdown, ErrorText, Row } from "../components/ui";
import { dateTime, initials, money, PAYER_LABEL, scheduleText, WARNING_LABEL } from "../format";
import { SITE } from "../site";
import type { Appointment, BookingResult, Department, Doctor, PayerType, Profile, ServiceType, Slot } from "../types";

type Mode = "department" | "doctor";
const STEPS = ["Dịch vụ", "Ngày giờ", "Thông tin", "Thanh toán"];
const EASE = [0.22, 1, 0.36, 1] as const;

/** Thanh tiến trình: đường nối chạy dần tới bước hiện tại, bước đang làm có vòng sáng. */
function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-10">
      <p className="mb-3 text-sm font-medium text-slate-500 sm:hidden">
        Bước {current + 1}/{STEPS.length}: <span className="text-slate-900">{STEPS[current]}</span>
      </p>
      <div className="relative">
        <div className="absolute left-10 right-10 top-4 h-1 rounded-full bg-slate-200" />
        <motion.div
          className="absolute left-10 right-10 top-4 h-1 origin-left rounded-full bg-gradient-to-r from-brand-600 to-accent-500"
          initial={false}
          animate={{ scaleX: current / (STEPS.length - 1) }}
          transition={{ duration: 0.6, ease: EASE }}
        />
        <ol className="relative flex justify-between">
          {STEPS.map((label, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={label} className="flex w-20 flex-col items-center gap-2">
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1.1 : 1 }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                    done || active ? "bg-brand-600 text-white shadow-glow" : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {active && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400" />}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={done ? "done" : "num"} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="relative">
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                    </motion.span>
                  </AnimatePresence>
                </motion.span>
                <span className={`hidden text-center text-sm font-medium transition-colors sm:block ${active || done ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Khối của một bước: trượt vào khi xuất hiện, có thể tự cuộn tới. */
function Section({ title, hint, icon, children, scrollOnMount }: { title: string; hint?: string; icon: ReactNode; children: ReactNode; scrollOnMount?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!scrollOnMount) return;
    const timer = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(timer);
  }, [scrollOnMount]);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="card scroll-mt-24 p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

/** Ô chọn dạng thẻ: viền và nền đổi màu, có dấu tích góc phải khi được chọn. */
function ChoiceCard({ active, onClick, disabled, className = "", children }: { active: boolean; onClick: () => void; disabled?: boolean; className?: string; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-2xl border text-left transition duration-200 ${
        active ? "border-brand-500 bg-brand-50/70 ring-4 ring-brand-100" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none ${className}`}
    >
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

/** Giá trị ở khung tóm tắt: mờ dần sang giá trị mới khi đổi. */
function Fade({ value }: { value: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="inline-block">
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

/** UC-03: đặt lịch bằng form, theo chuyên khoa hoặc theo bác sĩ (BR-12b, BR-13). */
export default function BookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const doctorParam = Number(params.get("doctor")) || null;
  const [mode, setMode] = useState<Mode>(doctorParam ? "doctor" : "department");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [doctorQuery, setDoctorQuery] = useState("");

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
    void api<Doctor[]>("/doctors").then((items) => {
      setDoctors(items);
      // Đến từ thẻ bác sĩ ở trang chủ: chọn sẵn bác sĩ và khoa của bác sĩ đó
      const picked = doctorParam ? items.find((d) => d.id === doctorParam) : undefined;
      if (picked) {
        setDoctorId(picked.id);
        setDepartmentId(picked.department_id);
      }
    });
  }, [doctorParam]);

  const service = services.find((item) => item.id === serviceId);
  const profile = profiles.find((item) => item.id === profileId);
  const department = departments.find((item) => item.id === departmentId);
  const doctor = doctors.find((item) => item.id === doctorId);
  const departmentDoctors = useMemo(() => doctors.filter((d) => d.department_id === departmentId), [doctors, departmentId]);
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const filteredDoctors = useMemo(() => {
    const query = doctorQuery.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((d) => `${d.title} ${d.full_name} ${deptName.get(d.department_id) ?? ""}`.toLowerCase().includes(query));
  }, [doctors, doctorQuery, deptName]);

  // Bác sĩ chọn sẵn từ đường dẫn: cuộn danh sách tới thẻ của bác sĩ đó (chỉ cuộn trong khung danh sách)
  const doctorList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = doctorList.current;
    const card = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (list && card) list.scrollTo({ top: card.offsetTop - list.clientHeight / 2 + card.clientHeight / 2, behavior: "smooth" });
  }, [doctors.length, mode]);

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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      navigate(`/appointments/${paid.id}/ticket`, { state: { justPaid: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thanh toán được");
    } finally {
      setBusy(false);
    }
  };

  const doctorLabel = slot?.doctor_name ?? (doctor ? `${doctor.title} ${doctor.full_name}` : "–");
  const summary = (
    <aside className="h-fit lg:sticky lg:top-24">
      <div className="card overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-5 text-white">
          <div className="absolute inset-0 bg-dots opacity-20" />
          <p className="relative text-xs font-medium uppercase tracking-wider text-brand-100">Thông tin đặt lịch</p>
          <p className="relative mt-1 text-lg font-bold">
            <Fade value={department?.name ?? "Chưa chọn khoa"} />
          </p>
        </div>
        <div className="divide-y divide-slate-100 px-6 py-3">
          <Row label="Hình thức"><Fade value={service?.name ?? "–"} /></Row>
          <Row label="Bác sĩ"><Fade value={doctorLabel} /></Row>
          <Row label="Thời gian"><Fade value={slot ? dateTime(slot.slot_time) : "–"} /></Row>
          <Row label="Phòng"><Fade value={slot?.room ?? "–"} /></Row>
          <Row label="Người khám"><Fade value={profile?.full_name ?? "–"} /></Row>
        </div>
        <div className="flex items-baseline justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-4">
          <span className="text-sm text-slate-500">Phí khám</span>
          <span className="text-2xl font-bold text-brand-700">
            <Fade value={slot ? money(slot.price) : "–"} />
          </span>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 px-1 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
        Số CCCD và số thẻ BHYT chỉ nhập ở trang Hồ sơ, được mã hóa khi lưu.
      </p>
    </aside>
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="pay" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.45, ease: EASE }}>
              <Stepper current={3} />
              <PaymentCard result={result} busy={busy} error={error} onPay={pay} />
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }}>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Đặt lịch khám</h1>
              <p className="mb-8 mt-1.5 text-slate-500">Chọn chuyên khoa hoặc bác sĩ, chọn giờ còn trống rồi xác nhận thông tin.</p>
              <Stepper current={step} />

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                  <Section title="Chọn dịch vụ" hint="Khám theo chuyên khoa, hoặc chọn bác sĩ bạn muốn." icon={<Stethoscope className="h-5 w-5" />}>
                    <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
                      {(["department", "doctor"] as Mode[]).map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            setMode(value);
                            setDoctorId(null);
                          }}
                          className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${mode === value ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          {mode === value && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                          <span className="relative">{value === "department" ? "Theo chuyên khoa" : "Theo bác sĩ"}</span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {mode === "department" ? (
                        <motion.div key="dept" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {departments.map((dept) => {
                            const active = dept.id === departmentId;
                            return (
                              <ChoiceCard key={dept.id} active={active} onClick={() => setDepartmentId(dept.id)} className="flex items-center gap-3 p-3">
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-brand-600 text-white shadow-glow" : "bg-brand-50 text-brand-600"}`}>
                                  <DepartmentIcon name={dept.name} className="h-5 w-5" />
                                </span>
                                <span className="text-sm font-medium text-slate-900">{dept.name}</span>
                              </ChoiceCard>
                            );
                          })}
                        </motion.div>
                      ) : (
                        <motion.div key="doctor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="relative mb-4">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input className="input pl-10" placeholder="Tìm theo tên bác sĩ hoặc chuyên khoa" value={doctorQuery} onChange={(e) => setDoctorQuery(e.target.value)} />
                          </div>
                          <div ref={doctorList} className="relative grid max-h-[26rem] gap-3 overflow-y-auto p-1.5 sm:grid-cols-2">
                            {filteredDoctors.map((d) => (
                              <ChoiceCard
                                key={d.id}
                                active={d.id === doctorId}
                                onClick={() => {
                                  setDoctorId(d.id);
                                  setDepartmentId(d.department_id);
                                }}
                                className="flex items-center gap-3 p-3"
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">{initials(d.full_name)}</span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-slate-900">
                                    {d.title} {d.full_name}
                                  </span>
                                  <span className="block truncate text-xs text-brand-700">{deptName.get(d.department_id)}</span>
                                  <span className="block truncate text-xs text-slate-500">{scheduleText(d)}</span>
                                </span>
                              </ChoiceCard>
                            ))}
                            {filteredDoctors.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-500">Không tìm thấy bác sĩ phù hợp.</p>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className="label mt-7">Hình thức khám</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {services.map((item) => (
                        <ChoiceCard key={item.id} active={item.id === serviceId} onClick={() => setServiceId(item.id)} className="p-3.5">
                          <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${item.allow_bhyt ? "bg-accent-50 text-accent-700" : "bg-slate-100 text-slate-500"}`}>
                            {item.allow_bhyt ? "Nhận BHYT" : "Không áp dụng BHYT"}
                          </span>
                        </ChoiceCard>
                      ))}
                    </div>

                    {mode === "department" && departmentId && service?.choose_doctor && departmentDoctors.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-5">
                        <label className="label">Bác sĩ (không bắt buộc)</label>
                        <select className="input" value={doctorId ?? ""} onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : null)}>
                          <option value="">Bác sĩ nào cũng được</option>
                          {departmentDoctors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title} {d.full_name}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </Section>

                  <AnimatePresence>
                    {departmentId && serviceId && (
                      <Section
                        key="slots"
                        title="Chọn ngày giờ"
                        hint={`Đặt trước từ 1 đến ${SITE.bookingDaysAhead} ngày. Lịch ngày mai phải đặt trước 16:30 hôm nay.`}
                        icon={<CalendarDays className="h-5 w-5" />}
                      >
                        <SlotPicker departmentId={departmentId} doctorId={doctorId} serviceTypeId={serviceId} selected={slot} onSelect={setSlot} />
                      </Section>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {slot && (
                      <Section key="info" title="Thông tin người khám" icon={<UserRound className="h-5 w-5" />} scrollOnMount>
                        {profiles.length === 0 ? (
                          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
                            <UserRound className="h-5 w-5" />
                            Bạn chưa có hồ sơ người bệnh.{" "}
                            <Link to="/profiles" className="font-semibold underline">
                              Tạo hồ sơ
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div>
                              <span className="label">Hồ sơ người bệnh</span>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {profiles.map((p) => (
                                  <ChoiceCard key={p.id} active={p.id === profileId} onClick={() => setProfileId(p.id)} className="flex items-center gap-3 p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 text-sm font-bold text-brand-700">{initials(p.full_name)}</span>
                                    <span>
                                      <span className="block text-sm font-semibold text-slate-900">{p.full_name}</span>
                                      <span className="block text-xs text-slate-500">
                                        {p.relation}
                                        {p.bhyt_code_masked ? " · có thẻ BHYT" : ""}
                                      </span>
                                    </span>
                                  </ChoiceCard>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="label">Đối tượng thanh toán</span>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {(Object.keys(PAYER_LABEL) as PayerType[]).map((value) => {
                                  const disabled = value.startsWith("bhyt") && (!service?.allow_bhyt || !profile?.bhyt_code_masked);
                                  return (
                                    <ChoiceCard key={value} active={payer === value} disabled={disabled} onClick={() => setPayer(value)} className="flex items-center gap-2.5 p-3 text-sm">
                                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${payer === value ? "border-brand-600" : "border-slate-300"}`}>
                                        {payer === value && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                                      </span>
                                      {PAYER_LABEL[value]}
                                    </ChoiceCard>
                                  );
                                })}
                              </div>
                              {!profile?.bhyt_code_masked && service?.allow_bhyt && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                  <Info className="h-3.5 w-3.5" /> Hồ sơ chưa có số thẻ BHYT, cập nhật ở trang Hồ sơ để dùng BHYT.
                                </p>
                              )}
                            </div>

                            <AnimatePresence initial={false}>
                              {payer === "bhyt_dung_tuyen" && (
                                <motion.div key="ref" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                  <label className="label">Hạn giấy chuyển tuyến (nếu có)</label>
                                  <input type="date" className="input max-w-xs" value={referralExpiry} onChange={(e) => setReferralExpiry(e.target.value)} />
                                </motion.div>
                              )}
                              {payer === "bhyt_trai_tuyen" && (
                                <motion.div key="trai" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    <p className="flex items-start gap-2">
                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                      Khám trái tuyến: BHYT chi trả 50% mức hưởng của thẻ. Cần ảnh CCCD hai mặt trong hồ sơ.
                                    </p>
                                    {!profile?.has_id_images && (
                                      <p className="mt-1 pl-6">
                                        Hồ sơ chưa có ảnh CCCD.{" "}
                                        <Link to="/profiles" className="font-semibold underline">
                                          Tải ảnh ở trang Hồ sơ
                                        </Link>
                                        .
                                      </p>
                                    )}
                                    <label className="mt-3 flex items-center gap-2 pl-6 font-medium">
                                      <input type="checkbox" className="accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                                      Tôi đồng ý cam kết khám BHYT trái tuyến
                                    </label>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div>
                              <label className="label">Triệu chứng (không bắt buộc)</label>
                              <textarea className="input" rows={2} placeholder="Ví dụ: đau thượng vị, ợ chua 1 tuần nay" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                            </div>
                            <ErrorText error={error} />
                            <button className="btn-primary btn-lg w-full shadow-glow" disabled={busy} onClick={submit}>
                              {busy ? "Đang giữ chỗ..." : "Xác nhận đặt lịch"}
                            </button>
                          </div>
                        )}
                      </Section>
                    )}
                  </AnimatePresence>
                </div>
                {summary}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Bước thanh toán (giả lập): lịch đang giữ chỗ, đếm ngược tới lúc tự hủy (BR-16). */
function PaymentCard({ result, busy, error, onPay }: { result: BookingResult; busy: boolean; error: string | null; onPay: () => void }) {
  const a = result.appointment;
  return (
    <div className="mx-auto max-w-lg">
      <div className="card overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-6 text-white">
          <div className="absolute inset-0 bg-dots opacity-20" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand-100">Thanh toán để hoàn tất</p>
              <p className="mt-1 text-xl font-bold">{a.department}</p>
              <p className="text-sm text-brand-100">{dateTime(a.slot_time)}</p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <CreditCard className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              Đang giữ chỗ cho bạn trong <Countdown until={a.hold_expires_at!} />. Quá thời gian này lịch sẽ tự hủy.
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            <Row label="Mã lịch">
              <span className="font-mono">{a.code}</span>
            </Row>
            <Row label="Người khám">{a.patient_name}</Row>
            <Row label="Bác sĩ">{a.doctor_name}</Row>
            <Row label="Đối tượng">{PAYER_LABEL[a.payer_type]}</Row>
          </div>
          {result.warnings.map((code) => (
            <p key={code} className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {WARNING_LABEL[code] ?? code}
            </p>
          ))}
          <div className="mt-5 flex items-baseline justify-between border-t border-dashed border-slate-200 pt-4">
            <span className="text-slate-500">Tổng cộng</span>
            <span className="text-3xl font-bold text-brand-700">{money(a.price)}</span>
          </div>
          <div className="mt-4">
            <ErrorText error={error} />
          </div>
          <button className="btn-primary btn-lg mt-4 w-full shadow-glow" disabled={busy} onClick={onPay}>
            <CreditCard className="h-5 w-5" /> {busy ? "Đang thanh toán..." : "Thanh toán (giả lập)"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">Bản demo không trừ tiền thật.</p>
        </div>
      </div>
    </div>
  );
}
