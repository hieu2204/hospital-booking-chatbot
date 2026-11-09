import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { api, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { phone: string; password: string; full_name: string; email: string | null; otp: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const loadUser = useCallback(async () => {
    try {
      setUser(await api<User>("/auth/me"));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) void loadUser();
  }, [loadUser]);

  const login = async (phone: string, password: string) => {
    const { access_token } = await api<{ access_token: string }>("/auth/login", { body: { phone, password } });
    setToken(access_token);
    await loadUser();
  };

  const register: AuthState["register"] = async (data) => {
    const { access_token } = await api<{ access_token: string }>("/auth/register", { body: data });
    setToken(access_token);
    await loadUser();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("chat_session");
    } catch {
      // bỏ qua
    }
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
  return value;
}

/** BR-11: trang cần đăng nhập. Chuyển tới trang đăng nhập rồi quay lại. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="p-8 text-center text-slate-500">Đang tải...</p>;
  if (!user) return <Navigate to={admin ? "/admin/login" : `/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
