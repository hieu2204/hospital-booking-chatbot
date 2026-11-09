/**
 * Thông tin hiển thị của bệnh viện (NFR-08: không rải giá trị cứng khắp các trang).
 * Chỉ dùng để trình bày; quy tắc nghiệp vụ như giờ đặt lịch, hạn hủy vẫn do backend kiểm tra.
 * Tên và địa chỉ khớp bảng `facilities` trong dữ liệu mẫu.
 */
export const SITE = {
  name: "Bệnh viện Demo",
  branch: "Cơ sở 1",
  address: "215 Hồng Bàng, Phường Chợ Lớn, TP.HCM",
  hotline: "1900 2827",
  emergencyPhone: "(028) 3952 5515",
  emergencyCall: "115",
  hours: {
    short: "T2–T6 07:00–16:30 · T7 07:00–12:00",
    compact: "T2–T6 07:00–16:30 · T7 sáng",
    weekday: "Thứ Hai – Thứ Sáu: 07:00 – 12:00, 13:00 – 16:30",
    saturday: "Thứ Bảy: 07:00 – 12:00",
    closed: "Chủ nhật, ngày lễ: nghỉ khám ngoại trú",
  },
  bookingDaysAhead: 30,
} as const;

export const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
