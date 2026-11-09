/** Minh họa vẽ bằng SVG, không dùng ảnh hay logo thật. */

/** Tòa nhà bệnh viện kiểu phẳng: khối nhà chính, cánh nhà, cây, đường đi. */
export function HospitalBuilding({ className = "", tone = "light" }: { className?: string; tone?: "light" | "onColor" }) {
  const onColor = tone === "onColor";
  const wall = onColor ? "rgba(255,255,255,0.95)" : "#ffffff";
  const wing = onColor ? "rgba(255,255,255,0.8)" : "#e8f1fd";
  const line = onColor ? "rgba(15,47,92,0.12)" : "#cfe0f6";
  const glass = "#9cc7f5";
  const glassDark = "#5d9de8";
  const cross = "#e11d48";
  const tree = onColor ? "#5eead4" : "#14b8a6";
  const treeDark = onColor ? "#2dd4bf" : "#0d9488";
  const ground = onColor ? "rgba(255,255,255,0.18)" : "#e2ecf8";

  const windows = (x0: number, y0: number, cols: number, rows: number) =>
    Array.from({ length: rows * cols }, (_, i) => {
      const x = x0 + (i % cols) * 26;
      const y = y0 + Math.floor(i / cols) * 30;
      return <rect key={`${x0}-${i}`} x={x} y={y} width="16" height="18" rx="3" fill={i % 3 === 1 ? glassDark : glass} />;
    });

  return (
    <svg viewBox="0 0 400 260" className={className} aria-hidden>
      <ellipse cx="200" cy="246" rx="190" ry="12" fill={ground} />
      {/* Cánh trái và phải */}
      <rect x="40" y="120" width="96" height="122" rx="6" fill={wing} stroke={line} strokeWidth="2" />
      <rect x="264" y="120" width="96" height="122" rx="6" fill={wing} stroke={line} strokeWidth="2" />
      {windows(56, 138, 3, 3)}
      {windows(280, 138, 3, 3)}
      {/* Khối chính */}
      <rect x="128" y="52" width="144" height="190" rx="8" fill={wall} stroke={line} strokeWidth="2" />
      <rect x="128" y="52" width="144" height="14" rx="7" fill={line} />
      {windows(146, 112, 5, 3)}
      {/* Biển chữ thập */}
      <circle cx="200" cy="86" r="18" fill="#fff1f2" stroke={line} strokeWidth="2" />
      <path d="M195 74h10v7h7v10h-7v7h-10v-7h-7V81h7z" fill={cross} />
      {/* Cửa chính */}
      <rect x="178" y="200" width="44" height="42" rx="4" fill={glassDark} />
      <path d="M200 200v42" stroke={wall} strokeWidth="2" />
      <rect x="166" y="194" width="68" height="8" rx="3" fill={line} />
      {/* Cây */}
      <rect x="22" y="206" width="5" height="36" rx="2" fill={treeDark} />
      <circle cx="24.5" cy="200" r="16" fill={tree} />
      <rect x="373" y="212" width="5" height="30" rx="2" fill={treeDark} />
      <circle cx="375.5" cy="206" r="13" fill={tree} />
      <circle cx="150" cy="232" r="9" fill={tree} />
      <circle cx="250" cy="232" r="9" fill={tree} />
    </svg>
  );
}

/** Hình 404: ống nghe và tấm bản đồ gấp, kèm dấu hỏi. */
export function LostIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden>
      <ellipse cx="120" cy="164" rx="96" ry="10" fill="#e2ecf8" />
      <path d="M44 40l52-14 48 14 52-14v112l-52 14-48-14-52 14z" fill="#ffffff" stroke="#cfe0f6" strokeWidth="2" />
      <path d="M96 26v112M144 40v112" stroke="#cfe0f6" strokeWidth="2" />
      <path d="M58 70c20-6 30 18 52 10s26-26 48-18 20 22 30 18" fill="none" stroke="#4f9bf0" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
      <circle cx="188" cy="80" r="8" fill="#e11d48" />
      <circle cx="188" cy="80" r="3" fill="#ffffff" />
      <circle cx="120" cy="112" r="26" fill="#0b63ce" />
      <text x="120" y="122" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff" fontFamily="Be Vietnam Pro, sans-serif">?</text>
    </svg>
  );
}
