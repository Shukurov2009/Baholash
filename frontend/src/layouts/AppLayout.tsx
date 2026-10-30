import { FormEvent, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/theme";
import { post, errorMessage } from "../api/client";
import { Button, cx, Input, Modal, Spinner, useToast } from "../components/ui";
import { t } from "../i18n";
import type { Role } from "../types";

export interface NavItem { to: string; label: string; end?: boolean }

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: t("roleStudent"),
  TEACHER: t("roleTeacher"),
  DIRECTOR: t("roleDirector"),
  SUPER_ADMIN: t("roleAdmin"),
};

/** Har rol uchun umumiy sidebar layout: kompyuterda yon panel, telefonda ochiladigan menyu. */
export default function AppLayout({ role, nav }: { role: Role; nav: NavItem[] }) {
  const { user, loading, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: "", next: "", next2: "" });

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.next2) return toast("Yangi parollar bir xil emas", "error");
    try {
      await post("/auth/change-password", { old_password: pw.old, new_password: pw.next });
      toast("Parol o'zgartirildi");
      setPwOpen(false);
      setPw({ old: "", next: "", next2: "" });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2">
        <p className="text-xl font-extrabold text-brand-600">{t("appName")}</p>
        <p className="text-xs text-slate-500">{user.school_name ?? ROLE_LABEL[role]}</p>
      </div>
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx(
              "rounded-xl px-3 py-3 text-sm font-medium",
              isActive
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )
          }
        >
          {n.label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
        <p className="truncate px-3 text-sm font-semibold">{user.full_name}</p>
        <p className="px-3 text-xs text-slate-500">{ROLE_LABEL[role]}</p>
        <button onClick={toggle} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {dark ? "☀️" : "🌙"} {t("darkMode")}
        </button>
        <button onClick={() => { setPwOpen(true); setOpen(false); }} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          🔑 Parolni o'zgartirish
        </button>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          {t("logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <p className="text-lg font-extrabold text-brand-600">{t("appName")}</p>
        <button onClick={() => setOpen(true)} aria-label="Menyu" className="rounded-lg px-3 py-1 text-2xl">☰</button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 md:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72 bg-white dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>{sidebar}</div>
        </div>
      )}

      {pwOpen && (
        <Modal title="Parolni o'zgartirish" onClose={() => setPwOpen(false)}>
          <form onSubmit={changePassword} className="space-y-3">
            <Input label="Eski parol" type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} required autoComplete="current-password" />
            <Input label="Yangi parol (kamida 6 belgi)" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} maxLength={72} autoComplete="new-password" />
            <Input label="Yangi parolni takrorlang" type="password" value={pw.next2} onChange={(e) => setPw({ ...pw, next2: e.target.value })} required autoComplete="new-password" />
            <Button type="submit" className="w-full">Saqlash</Button>
          </form>
        </Modal>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl"><Outlet /></div>
      </main>
    </div>
  );
}
