import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "baholash_token";

// localStorage ba'zi rejimlarda (maxfiy oyna) xato berishi mumkin — shuning uchun try/catch.
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* e'tiborsiz */
  }
}

// Kompyuterda (npm run dev) backend alohida portda: localhost:8000.
// Internetda (Vercel) backend shu saytning o'zida turadi, shuning uchun manzil nisbiy: "/api".
const API_ORIGIN = import.meta.env.DEV ? (import.meta.env.VITE_API_URL ?? "http://localhost:8000") : "";

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 (token yaroqsiz/muddati tugagan) bo'lsa — chiqarib yuboramiz. Login so'rovi bundan mustasno.
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/auth/login")) {
      setToken(null);
      window.location.href = "/";
    }
    // Super admin maktabga ruxsatni yopgan bo'lsa — chiqarib, sababini bosh sahifada ko'rsatamiz.
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (error.response?.status === 403 && typeof detail === "string" && detail.startsWith("Maktabingizga") && !url.includes("/auth/login")) {
      setToken(null);
      window.location.href = "/?closed=1";
    }
    return Promise.reject(error);
  },
);

/** Backend xatosidan o'qiladigan matn olish. */
export function errorMessage(e: unknown): string {
  const err = e as AxiosError<{ detail?: unknown; errors?: { loc: string[]; msg: string }[] }>;
  if (!err.response) return "Serverga ulanib bo'lmadi. Internetni tekshiring.";
  const d = err.response.data?.detail;
  if (typeof d === "string") {
    const first = err.response.data?.errors?.[0];
    return first ? `${d}: ${first.loc.slice(1).join(".")} — ${first.msg}` : d;
  }
  return "Kutilmagan xatolik yuz berdi";
}

export const get = async <T,>(url: string): Promise<T> => (await api.get<T>(url)).data;
export const post = async <T,>(url: string, body?: unknown): Promise<T> => (await api.post<T>(url, body)).data;
export const put = async <T,>(url: string, body?: unknown): Promise<T> => (await api.put<T>(url, body)).data;
export const del = async (url: string): Promise<void> => {
  await api.delete(url);
};

/** CSV hisobotni yuklab olish (token kerak bo'lgani uchun oddiy havola ishlamaydi). */
export async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
