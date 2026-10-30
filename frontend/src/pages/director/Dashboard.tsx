import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadFile, errorMessage, get } from "../../api/client";
import {
  Button, Card, Column, DataTable, EmptyState, fmt, Modal, Spinner, StarRating, StatCard,
  StatusBadge, useToast,
} from "../../components/ui";
import { MONTHS_UZ } from "../../i18n";
import type { AlertRow, CommentRow, Overview, TeacherDetail, TeacherRow } from "../../types";

const TREND_ICON = { up: "▲", down: "▼", flat: "▬" } as const;
const TREND_COLOR = { up: "text-emerald-600", down: "text-red-600", flat: "text-slate-400" } as const;

export default function DirectorDashboard() {
  const toast = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, tl, al] = await Promise.all([
        get<Overview>("/director/overview"),
        get<TeacherRow[]>("/director/teachers"),
        get<AlertRow[]>("/director/alerts"),
      ]);
      setOverview(o);
      setTeachers(tl);
      setAlerts(al);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  const closeDrawer = useCallback(() => setSelected(null), []);

  if (!overview) return <Spinner />;

  const chartData = teachers.filter((t) => t.avg !== null).map((t) => ({ name: t.full_name.split(" ")[0], avg: t.avg }));

  const columns: Column<TeacherRow>[] = [
    { key: "name", header: "O'qituvchi", render: (t) => <span className="font-medium">{t.full_name}</span> },
    { key: "subject", header: "Fan", render: (t) => t.subject },
    { key: "avg", header: "O'rtacha", render: (t) => fmt(t.avg) },
    {
      key: "trend", header: "O'zgarish",
      render: (t) => t.trend
        ? <span className={TREND_COLOR[t.trend.direction]}>{TREND_ICON[t.trend.direction]} {t.trend.delta > 0 ? "+" : ""}{t.trend.delta}</span>
        : <span className="text-slate-400">—</span>,
    },
    { key: "status", header: "Holat", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Umumiy ko'rinish</h1>
          <p className="text-sm text-slate-500">Joriy oy: {overview.month_name} {overview.year}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => downloadFile("/director/export", "hisobot.csv").catch((e) => toast(errorMessage(e), "error"))}
        >
          ⬇ Hisobot eksport qilish
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="O'qituvchilar" value={overview.teachers_count} />
        <StatCard label="O'quvchilar" value={overview.students_count} />
        <StatCard label="Qatnashuv" value={`${overview.participation}%`} hint={`${overview.voted_count} ta o'quvchi`} />
        <StatCard label="O'rtacha baho" value={fmt(overview.overall_avg)} />
      </div>

      {alerts.length > 0 && (
        <Card className="border-l-4 border-red-500">
          <h2 className="mb-2 font-semibold text-red-700 dark:text-red-300">⚠ Ogohlantirish: ketma-ket 3 oy bahosi past</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.teacher_id}>
                <button className="font-medium underline" onClick={() => setSelected(a.teacher_id)}>{a.full_name}</button>
                <span className="text-slate-500"> — {a.subject} ({a.months.map((m) => m.avg.toFixed(1)).join(" → ")})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">O'qituvchilar o'rtacha bahosi</h2>
        {chartData.length === 0 ? (
          <EmptyState title="Hozircha baholar yo'q" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="avg" name="O'rtacha" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Barcha o'qituvchilar</h2>
        <DataTable columns={columns} rows={teachers} onRowClick={(t) => setSelected(t.id)} empty="O'qituvchilar qo'shilmagan" />
        <p className="mt-2 text-xs text-slate-500">Yashil — 4 va undan yuqori · Sariq — 3–4 · Qizil — ketma-ket 3 oy 3 dan past</p>
      </div>

      {selected !== null && <TeacherDrawer id={selected} onClose={closeDrawer} />}
    </div>
  );
}

function TeacherDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState<TeacherDetail | null>(null);
  const [comments, setComments] = useState<CommentRow[] | null>(null);

  useEffect(() => {
    Promise.all([get<TeacherDetail>(`/director/teachers/${id}`), get<CommentRow[]>(`/director/teachers/${id}/comments`)])
      .then(([d, c]) => { setDetail(d); setComments(c); })
      .catch((e) => { toast(errorMessage(e), "error"); onClose(); });
  }, [id, onClose, toast]);

  const dist = detail ? Object.entries(detail.distribution).map(([star, count]) => ({ star: `${star}★`, count })) : [];

  return (
    <Modal title={detail ? detail.full_name : "Yuklanmoqda..."} onClose={onClose} side>
      {!detail || !comments ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-500">{detail.subject} · {detail.responses} ta javob</p>
            <StatusBadge status={detail.status} />
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold">{fmt(detail.avg)}</p>
            <StarRating value={detail.avg} size="lg" />
          </div>

          <section>
            <h3 className="mb-2 font-semibold">Har bir savol bo'yicha</h3>
            <ul className="space-y-2 text-sm">
              {detail.questions.map((q) => (
                <li key={q.question_id} className="flex justify-between gap-3">
                  <span>{q.text}</span><span className="font-semibold">{fmt(q.avg)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Baholar taqsimoti</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist}>
                  <XAxis dataKey="star" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="Soni" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Izohlar (anonim)</h3>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">Izohlar yo'q.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold">{c.code}</span>
                      <span>{MONTHS_UZ[c.month]} {c.year}</span>
                      {c.rating !== null && <span className="text-amber-500">{"★".repeat(c.rating)}</span>}
                    </p>
                    {c.question && <p className="mb-1 text-xs italic text-slate-500">{c.question}</p>}
                    <p>{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
