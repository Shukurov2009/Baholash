import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { errorMessage } from "../api/client";
import { HOME_BY_ROLE, useAuth } from "../context/AuthContext";
import { Button, Card, Input, Spinner } from "../components/ui";
import { t } from "../i18n";
import type { Role } from "../types";

// Har rol uchun alohida login sahifasi: o'quvchi/o'qituvchi — login, direktor/admin — email.
const CONFIG: Record<string, { role: Role; title: string; byEmail: boolean; hint: string }> = {
  student: { role: "STUDENT", title: t("roleStudent"), byEmail: false, hint: "Login" },
  teacher: { role: "TEACHER", title: t("roleTeacher"), byEmail: false, hint: "Login" },
  director: { role: "DIRECTOR", title: t("roleDirector"), byEmail: true, hint: "Email" },
  admin: { role: "SUPER_ADMIN", title: t("roleAdmin"), byEmail: true, hint: "Email" },
};

export default function Login() {
  const { role: param } = useParams();
  const cfg = param ? CONFIG[param] : undefined;
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!cfg) return <Navigate to="/" replace />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setBusy(true);
    setError("");
    try {
      const u = await login({
        ...(cfg.byEmail ? { email: ident } : { username: ident }),
        password,
        role: cfg.role,
      });
      navigate(HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <Link to="/" className="mb-4 text-sm text-slate-500">← {t("back")}</Link>
      <Card>
        <h1 className="mb-1 text-2xl font-bold">{cfg.title}</h1>
        <p className="mb-5 text-sm text-slate-500">{t("appName")} tizimiga kirish</p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={cfg.hint}
            type={cfg.byEmail ? "email" : "text"}
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label={t("password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t("loading") : t("login")}</Button>
        </form>
        {(param === "student" || param === "teacher") && (
          <p className="mt-4 text-center text-sm text-slate-500">
            Hisobingiz yo'qmi?{" "}
            <Link to={`/register/${param}`} className="font-semibold text-brand-600">Ro'yxatdan o'ting</Link>
          </p>
        )}
      </Card>
    </div>
  );
}
