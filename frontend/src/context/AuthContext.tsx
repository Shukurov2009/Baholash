import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { get, getToken, post, setToken } from "../api/client";
import type { Role, User } from "../types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (body: { username?: string; email?: string; password: string; role: Role }) => Promise<User>;
  register: (body: RegisterBody) => Promise<User>;
  logout: () => void;
}

export interface RegisterBody {
  role: "STUDENT" | "TEACHER";
  full_name: string;
  username: string;
  password: string;
  school_id: number;
  grade?: number;
  subject?: string;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  // Sahifa yangilanganda tokenni tekshirib, foydalanuvchini qayta tiklaymiz.
  useEffect(() => {
    if (!getToken()) return;
    get<User>("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login: AuthValue["login"] = useCallback(async (body) => {
    const res = await post<{ token: string; user: User }>("/auth/login", body);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // Ro'yxatdan o'tgach darrov tizimga kiramiz (token javobda keladi).
  const register: AuthValue["register"] = useCallback(async (body) => {
    const res = await post<{ token: string; user: User }>("/auth/register", body);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth faqat AuthProvider ichida ishlaydi");
  return ctx;
}

export const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: "/student/teachers",
  TEACHER: "/teacher",
  DIRECTOR: "/director",
  SUPER_ADMIN: "/admin",
};
