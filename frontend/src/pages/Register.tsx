import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { errorMessage, get } from "../api/client";
import { HOME_BY_ROLE, useAuth } from "../context/AuthContext";
import { Button, Card, Input, Spinner } from "../components/ui";
import { t } from "../i18n";

interface SchoolOpt { id: number; name: string }
const GRADES = [5, 6, 7, 8, 9, 10, 11]; // 1-4 sinflar ro'yxatdan o'tmaydi

const selectCls =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/** O'quvchi va o'qituvchi o'zi hisob ochadi. Direktor/admin uchun ro'yxatdan o'tish yo'q. */
export default function Register() {
  const { role: param } = useParams();
  const isStudent = param === "student";
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolOpt[] | null>(null);
  const [form, setForm] = useState({
    full_name: "", username: "", password: "", password2: "", school_id: "", grade: "", subject: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<SchoolOpt[]>("/auth/schools")
      .then((s) => {
        setSchools(s);
        if (s.length === 1) setForm((f) => ({ ...f, school_id: String(s[0].id) }));
      })
      .catch((e) => { setError(errorMessage(e)); setSchools([]); });
  }, []);

  if (loading) return <Spinner />;
  if (param !== "student" && param !== "teacher") return <Navigate to="/" replace />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) return setError("Parollar bir xil emas");
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(form.username)) {
      return setError("Login faqat lotin harflari, raqam va . _ - belgilaridan iborat bo'lsin (3–40 belgi)");
    }
    setBusy(true);
    try {
      const u = await register({
        role: isStudent ? "STUDENT" : "TEACHER",
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        password: form.password,
        school_id: Number(form.school_id),
        ...(isStudent ? { grade: Number(form.grade) } : { subject: form.subject.trim() }),
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
      <Link to={`/login/${param}`} className="mb-4 text-sm text-slate-500">← {t("back")}</Link>
      <Card>
        <h1 className="mb-1 text-2xl font-bold">Ro'yxatdan o'tish</h1>
        <p className="mb-5 text-sm text-slate-500">{isStudent ? t("roleStudent") : t("roleTeacher")}</p>
        {!schools ? (
          <Spinner />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input label="F.I.Sh. (to'liq)" value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} required minLength={3} autoComplete="name" />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Maktab</span>
              <select className={selectCls} value={form.school_id} onChange={(e) => set("school_id")(e.target.value)} required>
                <option value="" disabled>Tanlang</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {isStudent ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Sinf</span>
                <select className={selectCls} value={form.grade} onChange={(e) => set("grade")(e.target.value)} required>
                  <option value="" disabled>Tanlang</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}-sinf</option>)}
                </select>
                <span className="mt-1 block text-xs text-slate-500">Platforma 5-sinfdan boshlab.</span>
              </label>
            ) : (
              <Input label="Fan (masalan: Matematika)" value={form.subject} onChange={(e) => set("subject")(e.target.value)} required />
            )}
            <Input label="O'zingiz o'ylagan login (lotin harflari va raqam, @ bo'lmasin)" placeholder="masalan: fayzullo83" value={form.username} onChange={(e) => set("username")(e.target.value)} required autoComplete="username" autoCapitalize="none" />
            <Input label="Parol (kamida 6 belgi)" type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} required minLength={6} maxLength={72} autoComplete="new-password" />
            <Input label="Parolni takrorlang" type="password" value={form.password2} onChange={(e) => set("password2")(e.target.value)} required autoComplete="new-password" />
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            {schools.length === 0 && !error && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Hozircha maktablar qo'shilmagan. Avval super admin maktab qo'shishi kerak.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy || schools.length === 0}>{busy ? t("loading") : "Ro'yxatdan o'tish"}</Button>
            <p className="text-center text-xs text-slate-500">Login va parolni eslab qoling: keyingi safar shular bilan kirasiz.</p>
          </form>
        )}
      </Card>
    </div>
  );
}
