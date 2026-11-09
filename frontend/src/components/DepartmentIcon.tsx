import {
  Activity,
  Baby,
  Bone,
  Brain,
  Droplet,
  Ear,
  Eye,
  HeartPulse,
  Smile,
  Sparkles,
  Stethoscope,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon và màu theo tên khoa, chỉ để trình bày. Khoa mới chưa có trong danh sách dùng icon
 * ống nghe và màu thương hiệu. Lớp Tailwind viết đủ chữ để công cụ build nhận ra.
 */
export interface DepartmentTheme {
  icon: LucideIcon;
  /** Nền nhạt + chữ đậm, dùng cho ô icon và nhãn */
  soft: string;
  /** Nền đặc, dùng khi hover hoặc được chọn */
  solid: string;
  /** Hai đầu gradient cho phần đầu thẻ, banner */
  gradient: string;
  /** Viền khi hover */
  hoverBorder: string;
  /** Chữ màu của khoa */
  text: string;
}

const THEMES: [string, DepartmentTheme][] = [
  ["Tim mạch", { icon: HeartPulse, soft: "bg-rose-500/10 text-rose-600 dark:text-rose-300", solid: "bg-rose-500 text-white", gradient: "from-rose-500 to-rose-700", hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/50", text: "text-rose-600 dark:text-rose-300" }],
  ["Tiêu hóa", { icon: Activity, soft: "bg-amber-500/10 text-amber-600 dark:text-amber-300", solid: "bg-amber-500 text-white", gradient: "from-amber-500 to-orange-600", hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/50", text: "text-amber-600 dark:text-amber-300" }],
  ["Hô hấp", { icon: Wind, soft: "bg-sky-500/10 text-sky-600 dark:text-sky-300", solid: "bg-sky-500 text-white", gradient: "from-sky-500 to-sky-700", hoverBorder: "hover:border-sky-300 dark:hover:border-sky-500/50", text: "text-sky-600 dark:text-sky-300" }],
  ["Nội tiết", { icon: Droplet, soft: "bg-violet-500/10 text-violet-600 dark:text-violet-300", solid: "bg-violet-500 text-white", gradient: "from-violet-500 to-violet-700", hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/50", text: "text-violet-600 dark:text-violet-300" }],
  ["Thần kinh", { icon: Brain, soft: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", solid: "bg-indigo-500 text-white", gradient: "from-indigo-500 to-indigo-700", hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-500/50", text: "text-indigo-600 dark:text-indigo-300" }],
  ["Cơ xương khớp", { icon: Bone, soft: "bg-orange-500/10 text-orange-600 dark:text-orange-300", solid: "bg-orange-500 text-white", gradient: "from-orange-500 to-red-600", hoverBorder: "hover:border-orange-300 dark:hover:border-orange-500/50", text: "text-orange-600 dark:text-orange-300" }],
  ["Tai Mũi Họng", { icon: Ear, soft: "bg-teal-500/10 text-teal-600 dark:text-teal-300", solid: "bg-teal-500 text-white", gradient: "from-teal-500 to-teal-700", hoverBorder: "hover:border-teal-300 dark:hover:border-teal-500/50", text: "text-teal-600 dark:text-teal-300" }],
  ["Mắt", { icon: Eye, soft: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", solid: "bg-cyan-500 text-white", gradient: "from-cyan-500 to-blue-600", hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-500/50", text: "text-cyan-600 dark:text-cyan-300" }],
  ["Da liễu", { icon: Sparkles, soft: "bg-pink-500/10 text-pink-600 dark:text-pink-300", solid: "bg-pink-500 text-white", gradient: "from-pink-500 to-rose-600", hoverBorder: "hover:border-pink-300 dark:hover:border-pink-500/50", text: "text-pink-600 dark:text-pink-300" }],
  ["Phụ sản", { icon: Baby, soft: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300", solid: "bg-fuchsia-500 text-white", gradient: "from-fuchsia-500 to-purple-700", hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-500/50", text: "text-fuchsia-600 dark:text-fuchsia-300" }],
  ["Tiết niệu", { icon: Waves, soft: "bg-blue-500/10 text-blue-600 dark:text-blue-300", solid: "bg-blue-500 text-white", gradient: "from-blue-500 to-blue-700", hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/50", text: "text-blue-600 dark:text-blue-300" }],
  ["Răng", { icon: Smile, soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", solid: "bg-emerald-500 text-white", gradient: "from-emerald-500 to-emerald-700", hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/50", text: "text-emerald-600 dark:text-emerald-300" }],
];

const DEFAULT_THEME: DepartmentTheme = {
  icon: Stethoscope,
  soft: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  solid: "bg-brand-600 text-white",
  gradient: "from-brand-500 to-brand-700",
  hoverBorder: "hover:border-brand-300 dark:hover:border-brand-500/50",
  text: "text-brand-600 dark:text-brand-300",
};

export function departmentTheme(name: string | undefined | null): DepartmentTheme {
  if (!name) return DEFAULT_THEME;
  return THEMES.find(([key]) => name.includes(key))?.[1] ?? DEFAULT_THEME;
}

export function departmentIcon(name: string): LucideIcon {
  return departmentTheme(name).icon;
}

export default function DepartmentIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const Icon = departmentIcon(name);
  return <Icon className={className} />;
}
