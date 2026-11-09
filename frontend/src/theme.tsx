import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** Giao diện sáng, tối hoặc theo hệ điều hành. Lưu trong trình duyệt, chỉ là tùy chọn hiển thị. */
export type ThemeChoice = "light" | "dark" | "system";

const KEY = "theme";
const ThemeContext = createContext<{ choice: ThemeChoice; dark: boolean; setChoice: (c: ThemeChoice) => void }>({
  choice: "system",
  dark: false,
  setChoice: () => undefined,
});

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const systemDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [system, setSystem] = useState(systemDark);
  const dark = choice === "dark" || (choice === "system" && system);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystem(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setChoice = (next: ThemeChoice) => {
    setChoiceState(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Không lưu được thì chỉ áp dụng cho lần xem này
    }
  };

  return <ThemeContext.Provider value={{ choice, dark, setChoice }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
];

/** Nút đổi giao diện: biểu tượng mặt trời/mặt trăng xoay khi đổi, bấm mở menu ba lựa chọn. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { choice, dark, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        onClick={() => setOpen(!open)}
        aria-label="Đổi giao diện sáng tối"
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={dark ? "moon" : "sun"} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }}>
            {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-ring"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setChoice(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition hover:bg-slate-50 ${choice === option.value ? "font-semibold text-brand-600" : "text-slate-700"}`}
              >
                <option.icon className="h-4 w-4" /> {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
