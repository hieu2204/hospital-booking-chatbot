import type { AppointmentStatus, PayerType } from "./types";

const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function money(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function dateTime(iso: string): string {
  const value = new Date(iso);
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: TIME_ZONE }).format(value);
  const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE }).format(value);
  return `${capitalize(weekday)}, ${day} lúc ${time(iso)}`;
}

export function time(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }).format(new Date(iso));
}

export function dayLabel(isoDate: string): { weekday: string; date: string } {
  const value = new Date(`${isoDate}T12:00:00+07:00`);
  return {
    weekday: capitalize(new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: TIME_ZONE }).format(value)),
    date: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: TIME_ZONE }).format(value),
  };
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD. */
export function localDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(value));
}

export function addDays(isoDate: string, days: number): string {
  const value = new Date(`${isoDate}T12:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return localDate(value);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  completed: "Đã khám",
  expired: "Hết hạn giữ chỗ",
  cancelled: "Đã hủy",
  need_reschedule: "Cần đổi lịch",
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  expired: "bg-slate-100 text-slate-500",
  cancelled: "bg-slate-100 text-slate-500",
  need_reschedule: "bg-rose-100 text-rose-700",
};

export const PAYER_LABEL: Record<PayerType, string> = {
  none: "Dịch vụ (không dùng bảo hiểm)",
  bhyt_dung_tuyen: "BHYT đúng tuyến",
  bhyt_trai_tuyen: "BHYT trái tuyến",
  bao_lanh: "Bảo hiểm tư nhân (bảo lãnh)",
};

export const WARNING_LABEL: Record<string, string> = {
  REFERRAL_EXPIRES_BEFORE_VISIT: "Giấy chuyển tuyến hết hạn trước ngày khám, BHYT có thể không được áp dụng.",
};
