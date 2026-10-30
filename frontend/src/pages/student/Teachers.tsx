import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, get } from "../../api/client";
import { Card, EmptyState, Spinner, useToast } from "../../components/ui";
import { MONTHS_UZ } from "../../i18n";
import type { TeacherBrief } from "../../types";

export default function StudentTeachers() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<TeacherBrief[] | null>(null);
  const [voted, setVoted] = useState(false);
  const [month, setMonth] = useState(0);

  useEffect(() => {
    Promise.all([
      get<TeacherBrief[]>("/student/teachers"),
      get<{ voted: boolean; month: number }>("/student/vote-status"),
    ])
      .then(([tl, vs]) => {
        setTeachers(tl);
        setVoted(vs.voted);
        setMonth(vs.month);
      })
      .catch((e) => {
        toast(errorMessage(e), "error");
        setTeachers([]);
      });
  }, [toast]);

  if (!teachers) return <Spinner />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">O'qituvchini tanlang</h1>
        <p className="text-sm text-slate-500">Oyiga faqat bitta o'qituvchiga baho berasiz. Javobingiz anonim.</p>
      </div>

      {voted ? (
        <EmptyState icon="✅" title="Rahmat! Bu oy baho berib bo'ldingiz" text={`Keyingi baho — ${MONTHS_UZ[month % 12 + 1]} oyida.`} />
      ) : teachers.length === 0 ? (
        <EmptyState title="O'qituvchilar ro'yxati bo'sh" />
      ) : (
        <ul className="space-y-3">
          {teachers.map((t) => (
            <li key={t.id}>
              {/* Rasm ataylab yo'q: baho shaxsga emas, ishga beriladi */}
              <Link to={`/student/vote/${t.id}`}>
                <Card className="flex items-center justify-between transition hover:ring-brand-500">
                  <span>
                    <span className="block text-lg font-semibold">{t.full_name}</span>
                    <span className="text-sm text-slate-500">{t.subject}</span>
                  </span>
                  <span className="text-2xl text-slate-400">›</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
