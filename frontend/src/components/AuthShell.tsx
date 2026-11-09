import { CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const POINTS = [
  { icon: CalendarCheck, text: "Đặt lịch trước, nhận phiếu khám có số thứ tự" },
  { icon: MessageCircle, text: "Trợ lý ảo giải đáp thủ tục, đặt và hủy lịch 24/7" },
  { icon: ShieldCheck, text: "Số CCCD, thẻ BHYT được mã hóa khi lưu" },
];

/** Khung chung cho trang đăng nhập và đăng ký. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
      <div className="hidden flex-col justify-center rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex">
        <h2 className="text-3xl font-bold text-white">Chăm sóc sức khỏe, bắt đầu từ một lịch hẹn</h2>
        <ul className="mt-8 space-y-4">
          {POINTS.map((point) => (
            <li key={point.text} className="flex items-center gap-3 text-brand-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <point.icon className="h-5 w-5" />
              </span>
              {point.text}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-slate-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
