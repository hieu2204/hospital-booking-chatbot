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

// Icon theo tên khoa; khoa mới chưa có trong danh sách dùng icon ống nghe
const ICONS: [string, LucideIcon][] = [
  ["Tim mạch", HeartPulse],
  ["Tiêu hóa", Activity],
  ["Hô hấp", Wind],
  ["Nội tiết", Droplet],
  ["Thần kinh", Brain],
  ["Cơ xương khớp", Bone],
  ["Tai Mũi Họng", Ear],
  ["Mắt", Eye],
  ["Da liễu", Sparkles],
  ["Phụ sản", Baby],
  ["Tiết niệu", Waves],
  ["Răng", Smile],
];

export function departmentIcon(name: string): LucideIcon {
  return ICONS.find(([key]) => name.includes(key))?.[1] ?? Stethoscope;
}

export default function DepartmentIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const Icon = departmentIcon(name);
  return <Icon className={className} />;
}
