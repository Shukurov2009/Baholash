import { FormEvent, useCallback, useEffect, useState } from "react";
import { del, errorMessage, get, post, put } from "../../api/client";
import {
  Button, Card, Column, ConfirmDialog, DataTable, Input, Modal, Spinner, cx, useToast,
} from "../../components/ui";
import type { StudentRow, TeacherRow } from "../../types";

type Tab = "teachers" | "students" | "questions";
const TABS: { id: Tab; label: string }[] = [
  { id: "teachers", label: "O'qituvchilar" },
  { id: "students", label: "O'quvchilar" },
  { id: "questions", label: "Savollar" },
];

export default function DirectorSettings() {
  const [tab, setTab] = useState<Tab>("teachers");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Sozlamalar</h1>
      <div className="flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold",
              tab === t.id ? "bg-brand-600 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "teachers" && <People kind="teachers" />}
      {tab === "students" && <People kind="students" />}
      {tab === "questions" && <Questions />}
    </div>
  );
}

// ------------------------------------------------------------------ O'qituvchi / O'quvchi CRUD
type Person = { id: number; full_name: string; subject?: string; username: string | null; grade?: number | null };
interface Credentials { username: string | null; password: string | null }

function People({ kind }: { kind: "teachers" | "students" }) {
  const toast = useToast();
  const isTeacher = kind === "teachers";
  const [rows, setRows] = useState<Person[] | null>(null);
  const [form, setForm] = useState<{ id?: number; full_name: string; subject: string; username: string; grade: string } | null>(null);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Person | null>(null);
  const [creds, setCreds] = useState<Credentials | null>(null);

  const load = useCallback(() => {
    const url = isTeacher ? "/director/teachers" : "/director/students";
    get<(TeacherRow | StudentRow)[]>(url)
      .then((r) => setRows(r as Person[]))
      .catch((e) => { toast(errorMessage(e), "error"); setRows([]); });
  }, [isTeacher, toast]);
  useEffect(() => { setRows(null); load(); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      const base = `/director/${kind}`;
      if (form.id) {
        await put(`${base}/${form.id}`, { full_name: form.full_name, ...(isTeacher ? { subject: form.subject } : {}) });
        toast("Saqlandi");
      } else {
        const res = await post<Credentials>(base, {
          full_name: form.full_name,
          ...(isTeacher ? { subject: form.subject } : form.grade ? { grade: Number(form.grade) } : {}),
          ...(form.username ? { username: form.username } : {}),
        });
        setCreds({ username: res.username, password: res.password }); // parol faqat bir marta ko'rsatiladi
      }
      setForm(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function resetPassword(p: Person) {
    try {
      const res = await put<{ password: string | null }>(`/director/${kind}/${p.id}`, { reset_password: true });
      setCreds({ username: p.username, password: res.password });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await del(`/director/${kind}/${toDelete.id}`);
      toast("O'chirildi");
      setToDelete(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (!rows) return <Spinner />;

  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((p) => p.full_name.toLowerCase().includes(needle) || (p.username ?? "").toLowerCase().includes(needle)) : rows;

  const columns: Column<Person>[] = [
    { key: "name", header: "F.I.Sh.", render: (p) => <span className="font-medium">{p.full_name}</span> },
    ...(isTeacher
      ? [{ key: "subject", header: "Fan", render: (p: Person) => p.subject ?? "" }]
      : [{ key: "grade", header: "Sinf", render: (p: Person) => (p.grade ? `${p.grade}-sinf` : "—") }]),
    { key: "username", header: "Login", render: (p) => p.username ?? "—" },
    {
      key: "actions", header: "", className: "text-right whitespace-nowrap",
      render: (p) => (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" className="min-h-[36px] px-2" onClick={() => setForm({ id: p.id, full_name: p.full_name, subject: p.subject ?? "", username: p.username ?? "", grade: "" })}>Tahrirlash</Button>
          <Button variant="ghost" className="min-h-[36px] px-2" onClick={() => resetPassword(p)}>Yangi parol</Button>
          <Button variant="ghost" className="min-h-[36px] px-2 text-red-600" onClick={() => setToDelete(p)}>O'chirish</Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setForm({ full_name: "", subject: "", username: "", grade: "" })}>+ {isTeacher ? "O'qituvchi" : "O'quvchi"} qo'shish</Button>
        <div className="min-w-[180px] flex-1"><Input placeholder="Ism yoki login bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Qidirish" /></div>
        <span className="text-sm text-slate-500">Jami: {rows.length}</span>
      </div>
      <DataTable columns={columns} rows={filtered} empty="Ro'yxat bo'sh" />
      <p className="text-xs text-slate-500">Foydalanuvchilar o'zlari ro'yxatdan o'tadi. Bu yerda ularni tahrirlash, yangi parol berish yoki o'chirish mumkin (masalan, noto'g'ri ro'yxatdan o'tgan hisobni).</p>

      {form && (
        <Modal title={form.id ? "Tahrirlash" : "Yangi qo'shish"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Input label="F.I.Sh." value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required minLength={3} />
            {isTeacher && <Input label="Fan" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />}
            {!isTeacher && !form.id && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Sinf</span>
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Tanlanmagan</option>
                  {[5, 6, 7, 8, 9, 10, 11].map((g) => <option key={g} value={g}>{g}-sinf</option>)}
                </select>
              </label>
            )}
            {!form.id && (
              <Input
                label="Login (bo'sh qoldirsangiz avtomatik)"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            )}
            <Button type="submit" className="w-full">Saqlash</Button>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          danger
          title={`${toDelete.full_name} o'chirilsinmi?`}
          text={isTeacher ? "Uning barcha baholari va izohlari ham o'chadi." : "Uning kirish huquqi o'chadi. Berilgan baholar anonim holda qoladi."}
          onYes={remove}
          onNo={() => setToDelete(null)}
        />
      )}

      {creds && (
        <Modal title="Kirish ma'lumotlari" onClose={() => setCreds(null)}>
          <p className="mb-3 text-sm text-slate-500">Parolni hozir yozib oling — keyin qayta ko'rsatilmaydi.</p>
          <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-lg dark:bg-slate-800">
            <div><dt className="text-xs text-slate-500">Login</dt><dd className="font-mono font-bold">{creds.username}</dd></div>
            <div><dt className="text-xs text-slate-500">Parol</dt><dd className="font-mono font-bold">{creds.password ?? "(o'zingiz kiritgan)"}</dd></div>
          </dl>
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ So'rovnoma muharriri
interface QItem { id?: number; text: string; is_active: boolean }

function Questions() {
  const toast = useToast();
  const [items, setItems] = useState<QItem[] | null>(null);
  const [custom, setCustom] = useState(false);

  useEffect(() => {
    get<{ custom: boolean; questions: QItem[] }>("/director/questions")
      .then((r) => { setItems(r.questions); setCustom(r.custom); })
      .catch((e) => { toast(errorMessage(e), "error"); setItems([]); });
  }, [toast]);

  if (!items) return <Spinner />;

  const patch = (i: number, p: Partial<QItem>) => setItems(items.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };

  async function save() {
    try {
      const r = await put<{ custom: boolean; questions: QItem[] }>("/director/questions", { questions: items });
      setItems(r.questions);
      setCustom(r.custom);
      toast("Savollar saqlandi");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div className="space-y-4">
      {!custom && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Hozir umumiy savollar ishlatilmoqda. O'zgartirib saqlasangiz, maktabingiz uchun alohida nusxa yaratiladi.</p>}
      <Card className="space-y-3">
        {items.map((q, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-slate-500">{i + 1}.</span>
            <input
              value={q.text}
              onChange={(e) => patch(i, { text: e.target.value })}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            />
            <Button variant="ghost" className="px-2" aria-label="Yuqoriga" onClick={() => move(i, -1)}>↑</Button>
            <Button variant="ghost" className="px-2" aria-label="Pastga" onClick={() => move(i, 1)}>↓</Button>
            <Button variant="ghost" className="px-2 text-red-600" aria-label="O'chirish" onClick={() => setItems(items.filter((_, k) => k !== i))}>✕</Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" onClick={() => setItems([...items, { text: "", is_active: true }])} disabled={items.length >= 20}>+ Savol qo'shish</Button>
          <Button onClick={save} disabled={items.length === 0 || items.some((q) => q.text.trim().length < 3)}>Saqlash</Button>
        </div>
      </Card>
    </div>
  );
}
