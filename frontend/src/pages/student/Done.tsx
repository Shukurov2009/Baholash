import { Link } from "react-router-dom";
import { Card } from "../../components/ui";

export default function StudentDone() {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-3 py-10 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-extrabold">Rahmat!</h1>
        <p className="text-slate-600 dark:text-slate-300">Bahoyingiz qabul qilindi.</p>
        <p className="mx-auto max-w-sm text-sm text-slate-500">
          Sizning javobingiz to'liq anonim: o'qituvchi izohlaringizni hech qachon ko'rmaydi, direktor esa
          izohlarni ismsiz, faqat tasodifiy kod bilan ko'radi.
        </p>
        <Link to="/student/teachers" className="inline-block pt-2 text-sm font-semibold text-brand-600">Bosh sahifaga</Link>
      </Card>
    </div>
  );
}
