import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage, get } from "../../api/client";
import { Card, EmptyState, fmt, Spinner, StarRating, StatCard, useToast } from "../../components/ui";
import type { MonthPoint, TeacherSummary } from "../../types";

export default function TeacherDashboard() {
  const toast = useToast();
  const [sum, setSum] = useState<TeacherSummary | null>(null);
  const [trend, setTrend] = useState<MonthPoint[]>([]);

  useEffect(() => {
    Promise.all([get<TeacherSummary>("/teacher/summary"), get<MonthPoint[]>("/teacher/trend")])
      .then(([s, tr]) => { setSum(s); setTrend(tr); })
      .catch((e) => toast(errorMessage(e), "error"));
  }, [toast]);

  if (!sum) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Salom, {sum.full_name}!</h1>
        <p className="text-sm text-slate-500">{sum.subject}</p>
      </div>

      <Card className="space-y-2 py-8 text-center">
        <p className="text-sm text-slate-500">Umumiy o'rtacha baho</p>
        <p className="text-6xl font-extrabold text-brand-600">{fmt(sum.avg, 1)}</p>
        <StarRating value={sum.avg} size="lg" />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Javoblar soni" value={sum.responses} />
        <StatCard label="Shu oy" value={fmt(sum.this_month_avg, 1)} hint={`${sum.this_month_count} ta javob`} />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Savollar bo'yicha</h2>
        {sum.questions.length === 0 ? (
          <p className="text-sm text-slate-500">Hozircha baholar yo'q.</p>
        ) : (
          <ul className="space-y-3">
            {sum.questions.map((q) => (
              <li key={q.question_id}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{q.text}</span>
                  <span className="font-semibold">{fmt(q.avg, 1)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(q.avg / 5) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Oylik tendensiya</h2>
        {trend.length < 2 ? (
          <p className="text-sm text-slate-500">Tendensiya uchun kamida 2 oylik ma'lumot kerak.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis domain={[1, 5]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" name="O'rtacha" stroke="#14b8a6" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Izohlar o'qituvchiga hech qachon ko'rsatilmaydi — backendda ham bunday endpoint yo'q. */}
      <EmptyState
        icon="🔒"
        title="Izohlar ko'rinmaydi"
        text="O'quvchilar izohlari anonimlikni himoya qilish uchun o'qituvchilarga ko'rsatilmaydi. Siz faqat baholar va tendensiyani ko'rasiz."
      />
    </div>
  );
}
