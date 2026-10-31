import { Link, Navigate, useSearchParams } from "react-router-dom";
import { HOME_BY_ROLE, useAuth } from "../context/AuthContext";
import { Card, Spinner } from "../components/ui";
import { t } from "../i18n";

const ROLES = [
  { role: "student", icon: "🎒", label: t("roleStudent"), text: "Oyiga bir marta o'qituvchini anonim baholang" },
  { role: "teacher", icon: "👩‍🏫", label: t("roleTeacher"), text: "O'z natijalaringizni ko'ring" },
  { role: "director", icon: "🏫", label: t("roleDirector"), text: "Maktab bo'yicha hisobotlar va sozlamalar" },
  { role: "admin", icon: "🛠️", label: t("roleAdmin"), text: "Maktablar, direktorlar va ruxsatlar" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-extrabold text-brand-600">{t("appName")}</h1>
        <p className="mt-1 text-slate-500">{t("chooseRole")}</p>
      </div>
      {params.get("closed") && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Maktabingizga hozircha ruxsat berilmagan yoki muddati tugagan. Direktor bilan bog'laning.
        </p>
      )}
      {ROLES.map((r) => (
        <Link key={r.role} to={`/login/${r.role}`}>
          <Card className="flex items-center gap-4 transition hover:ring-brand-500">
            <span className="text-3xl">{r.icon}</span>
            <span>
              <span className="block font-semibold">{r.label}</span>
              <span className="text-sm text-slate-500">{r.text}</span>
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
