/**
 * Avatar minh họa cho bác sĩ, vẽ bằng SVG, không dùng ảnh người thật (tên bác sĩ là giả định).
 * Kiểu tóc, màu da, kính và màu áo trong chọn cố định theo mã bác sĩ, nên mỗi người một vẻ
 * và không đổi giữa các lần tải trang.
 */
const SKIN = ["#f6d5bd", "#eab896", "#d6a07a", "#b07a55"];
const SKIN_SHADE = ["#e9bfa2", "#d9a17d", "#c08962", "#946243"];
const HAIR = ["#1f2937", "#3b2a20", "#6b4226", "#4b5563"];
const SCRUBS = ["#2563eb", "#0d9488", "#7c3aed", "#0891b2", "#db2777"];

function pick<T>(list: T[], seed: number, salt: number): T {
  return list.at((seed * 7 + salt * 13) % list.length) as T;
}

export default function DoctorAvatar({ seed, className = "h-full w-full" }: { seed: number; className?: string }) {
  const skinIndex = (seed * 7 + 3 * 13) % SKIN.length;
  const skin = SKIN.at(skinIndex)!;
  const shade = SKIN_SHADE.at(skinIndex)!;
  const hair = pick(HAIR, seed, 5);
  const scrubs = pick(SCRUBS, seed, 2);
  const style = (seed * 5 + 1) % 3;
  const glasses = seed % 3 === 0;

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {/* Tóc dài nằm sau đầu */}
      {style === 1 && <path d="M37 52c-2-24 11-33 23-33s26 9 23 33l3 30c-6 4-11 3-14-1V48c-6-6-18-6-24 0v33c-3 4-8 5-14 1z" fill={hair} />}
      {/* Áo blouse trắng và áo trong */}
      <path d="M12 120c0-26 20-40 48-40s48 14 48 40z" fill="#ffffff" />
      <path d="M12 120c0-26 20-40 48-40s48 14 48 40" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M47 81l13 24 13-24c-4-1-8-1-13-1s-9 0-13 1z" fill={scrubs} />
      <path d="M47 81l-6 39M73 81l6 39" stroke="#cbd5e1" strokeWidth="1.5" />
      {/* Cổ */}
      <path d="M51 66h18v14c0 5-18 5-18 0z" fill={shade} />
      {/* Đầu, tai */}
      <circle cx="39" cy="52" r="5" fill={shade} />
      <circle cx="81" cy="52" r="5" fill={shade} />
      <ellipse cx="60" cy="50" rx="21" ry="24" fill={skin} />
      {/* Tóc phía trước */}
      {style === 0 && <path d="M38 50c-3-21 9-29 22-29 14 0 25 8 22 29-3-9-10-15-22-15S41 41 38 50z" fill={hair} />}
      {style === 1 && <path d="M39 46c1-15 10-21 21-21s20 6 21 21c-6-6-13-9-21-9s-15 3-21 9z" fill={hair} />}
      {style === 2 && (
        <>
          <circle cx="60" cy="21" r="9" fill={hair} />
          <path d="M38 49c-2-19 9-26 22-26s24 7 22 26c-4-8-11-12-22-12s-18 4-22 12z" fill={hair} />
        </>
      )}
      {/* Mặt */}
      <circle cx="52" cy="53" r="2.2" fill="#1e293b" />
      <circle cx="68" cy="53" r="2.2" fill="#1e293b" />
      <path d="M54 63c3 3 9 3 12 0" fill="none" stroke="#9a5b45" strokeWidth="2" strokeLinecap="round" />
      <circle cx="47" cy="60" r="3" fill="#f4a7a0" opacity="0.35" />
      <circle cx="73" cy="60" r="3" fill="#f4a7a0" opacity="0.35" />
      {glasses && (
        <g fill="none" stroke="#334155" strokeWidth="1.8">
          <circle cx="52" cy="53" r="6" />
          <circle cx="68" cy="53" r="6" />
          <path d="M58 53h4" />
        </g>
      )}
      {/* Ống nghe */}
      <path d="M50 82c-5 12-2 22 8 24 8 1 14-5 15-12" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="73" cy="92" r="4.5" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
    </svg>
  );
}
