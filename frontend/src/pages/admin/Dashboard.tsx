import { FormEvent, useCallback, useEffect, useState } from "react";
import { del, errorMessage, get, post, put } from "../../api/client";
import {
  Button, Column, ConfirmDialog, DataTable, Input, Modal, Spinner, StatCard, useToast,
} from "../../components/ui";
import type { AdminDirector, AdminSchool, AdminStats } from "../../types";

const selectCls =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900";

// Ruxsat muddati variantlari (days: null = muddatsiz).
const PERIODS: { label: string; days: number | null }[] = [
  { label: "1 oy", days: 30 },
  { label: "3 oy", days: 90 },
  { label: "6 oy", days: 180 },
  { label: "1 yil", days: 365 },
  { label: "Muddatsiz", days: null },
];

const som = (n: number) => `${n.toLocaleString("ru-RU")} so'm`;
const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso + "Z");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

function AccessBadge({ s }: { s: AdminSchool }) {
  const a = s.access;
  if (a.status === "active") {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Ochiq · {a.until ? `${fmtDate(a.until)} gacha (${a.days_left} kun)` : "muddatsiz"}
      </span>
    );
  }
  if (a.status === "expired") {
    return <span className="inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Muddati tugagan ({fmtDate(a.until)})</span>;
  }
  return <span className="inline-block rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">Yopiq</span>;
}

/** Super admin: maktablar va direktorlar. Direktor hisobini faqat shu yerdan ochish mumkin. */
export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [directors, setDirectors] = useState<AdminDirector[]>([]);
  const [newSchool, setNewSchool] = useState<{ name: string; open: boolean; days: number | null; paid: string } | null>(null);
  const [access, setAccess] = useState<{ school: AdminSchool; days: number | null; paid: string } | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<AdminSchool | null>(null);
  const [newDir, setNewDir] = useState<{ school_id: string; full_name: string; email: string; password: string } | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [toDelete, setToDelete] = useState<AdminDirector | null>(null);

  const load = useCallback(() => {
    Promise.all([get<AdminStats>("/admin/stats"), get<AdminSchool[]>("/admin/schools"), get<AdminDirector[]>("/admin/directors")])
      .then(([s, sc, d]) => { setStats(s); setSchools(sc); setDirectors(d); })
      .catch((e) => toast(errorMessage(e), "error"));
  }, [toast]);
  useEffect(load, [load]);

  async function createSchool(e: FormEvent) {
    e.preventDefault();
    if (!newSchool) return;
    try {
      await post("/admin/schools", {
        name: newSchool.name,
        open: newSchool.open,
        days: newSchool.open ? newSchool.days : null,
        ...(newSchool.open && Number(newSchool.paid) > 0 ? { paid_amount: Number(newSchool.paid) } : {}),
      });
      toast("Maktab qo'shildi");
      setNewSchool(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function saveAccess(enabled: boolean) {
    if (!access) return;
    try {
      await put(`/admin/schools/${access.school.id}/access`, {
        enabled,
        days: enabled ? access.days : null,
        ...(enabled && Number(access.paid) > 0 ? { paid_amount: Number(access.paid) } : {}),
      });
      toast(enabled ? "Ruxsat berildi" : "Maktab yopildi");
      setAccess(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function removeSchool() {
    if (!schoolToDelete) return;
    try {
      await del(`/admin/schools/${schoolToDelete.id}`);
      toast("Maktab o'chirildi");
      setSchoolToDelete(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function createDirector(e: FormEvent) {
    e.preventDefault();
    if (!newDir) return;
    try {
      const res = await post<{ email: string; password: string | null }>("/admin/directors", {
        school_id: Number(newDir.school_id),
        full_name: newDir.full_name,
        email: newDir.email,
        ...(newDir.password ? { password: newDir.password } : {}),
      });
      setCreds({ email: res.email, password: res.password ?? "(o'zingiz kiritgan parol)" });
      setNewDir(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function removeDirector() {
    if (!toDelete) return;
    try {
      await del(`/admin/directors/${toDelete.id}`);
      toast("Direktor o'chirildi");
      setToDelete(null);
      load();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (!stats) return <Spinner />;

  const schoolCols: Column<AdminSchool>[] = [
    {
      key: "name", header: "Maktab",
      render: (x) => (
        <div>
          <p className="font-medium">{x.name}</p>
          <p className="text-xs text-slate-500">{x.directors.length ? x.directors.map((d) => d.full_name).join(", ") : "Direktor yo'q"}</p>
        </div>
      ),
    },
    { key: "access", header: "Ruxsat", render: (x) => <AccessBadge s={x} /> },
    { key: "people", header: "O'qituvchi / O'quvchi", render: (x) => `${x.teachers_count} / ${x.students_count}` },
    { key: "paid", header: "To'langan", render: (x) => (x.access.paid_amount ? som(x.access.paid_amount) : "—") },
    {
      key: "act", header: "", className: "text-right whitespace-nowrap",
      render: (x) => (
        <span className="flex justify-end gap-1">
          <Button variant="secondary" className="min-h-[36px] px-3" onClick={() => setAccess({ school: x, days: 365, paid: "" })}>
            {x.access.status === "active" ? "Ruxsatni boshqarish" : "Ruxsat berish"}
          </Button>
          <Button variant="ghost" className="min-h-[36px] px-2 text-red-600" onClick={() => setSchoolToDelete(x)}>O'chirish</Button>
        </span>
      ),
    },
  ];
  const dirCols: Column<AdminDirector>[] = [
    { key: "name", header: "Direktor", render: (d) => <span className="font-medium">{d.full_name}</span> },
    { key: "email", header: "Email", render: (d) => d.email },
    { key: "school", header: "Maktab", render: (d) => d.school_name ?? "—" },
    { key: "act", header: "", className: "text-right", render: (d) => <Button variant="ghost" className="min-h-[36px] px-2 text-red-600" onClick={() => setToDelete(d)}>O'chirish</Button> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Super admin</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Maktablar" value={stats.schools_count} hint={`${stats.open_schools} ochiq · ${stats.closed_schools} yopiq`} />
        <StatCard label="Direktorlar" value={stats.directors_count} />
        <StatCard label="O'qituvchilar" value={stats.teachers_count} />
        <StatCard label="O'quvchilar" value={stats.students_count} />
      </div>
      <StatCard label="Jami to'langan" value={som(stats.revenue)} hint="Ruxsat berishda kiritgan summalaringiz yig'indisi" />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Maktablar</h2>
          <Button variant="secondary" onClick={() => setNewSchool({ name: "", open: false, days: 365, paid: "" })}>+ Maktab qo'shish</Button>
        </div>
        <DataTable columns={schoolCols} rows={schools} empty="Maktablar yo'q. Avval maktab qo'shing." />
        <p className="text-xs text-slate-500">Maktabni faqat siz qo'shasiz. Yopiq maktabda hech kim kira va ro'yxatdan o'ta olmaydi. Pul to'langach "Ruxsat berish" ni bosing.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Direktorlar</h2>
          <Button disabled={schools.length === 0} onClick={() => setNewDir({ school_id: schools.length === 1 ? String(schools[0].id) : "", full_name: "", email: "", password: "" })}>
            + Direktor qo'shish
          </Button>
        </div>
        <DataTable columns={dirCols} rows={directors} empty="Direktorlar yo'q" />
        <p className="text-xs text-slate-500">Direktor hisobini faqat siz yaratasiz. Ro'yxatdan o'tish sahifasida direktor bo'lib bo'lmaydi.</p>
      </section>

      {newSchool && (
        <Modal title="Yangi maktab" onClose={() => setNewSchool(null)}>
          <form onSubmit={createSchool} className="space-y-3">
            <Input label="Maktab nomi" value={newSchool.name} onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })} required minLength={2} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newSchool.open} onChange={(e) => setNewSchool({ ...newSchool, open: e.target.checked })} />
              Darrov ruxsat berish (aks holda maktab yopiq turadi)
            </label>
            {newSchool.open && (
              <>
                <PeriodPicker value={newSchool.days} onChange={(d) => setNewSchool({ ...newSchool, days: d })} />
                <Input label="To'langan summa, so'm (ixtiyoriy)" type="number" min={0} value={newSchool.paid} onChange={(e) => setNewSchool({ ...newSchool, paid: e.target.value })} />
              </>
            )}
            <Button type="submit" className="w-full">Qo'shish</Button>
          </form>
        </Modal>
      )}

      {access && (
        <Modal title={access.school.name} onClose={() => setAccess(null)}>
          <div className="space-y-4">
            <p className="text-sm">Hozir: <AccessBadge s={access.school} /></p>
            <PeriodPicker value={access.days} onChange={(d) => setAccess({ ...access, days: d })} />
            {access.school.access.status === "active" && access.school.access.until && access.days !== null && (
              <p className="text-xs text-slate-500">Tanlangan muddat hozirgi tugash sanasiga qo'shiladi.</p>
            )}
            <Input label="Shu safar to'langan summa, so'm (ixtiyoriy)" type="number" min={0} value={access.paid} onChange={(e) => setAccess({ ...access, paid: e.target.value })} />
            <Button className="w-full" onClick={() => saveAccess(true)}>✓ Ruxsat berish</Button>
            {access.school.access.enabled && (
              <Button variant="danger" className="w-full" onClick={() => saveAccess(false)}>Maktabni yopish</Button>
            )}
          </div>
        </Modal>
      )}

      {schoolToDelete && (
        <ConfirmDialog
          danger
          title={`"${schoolToDelete.name}" butunlay o'chirilsinmi?`}
          text={`Maktabdagi ${schoolToDelete.teachers_count} o'qituvchi, ${schoolToDelete.students_count} o'quvchi, direktor hisoblari, barcha baho va izohlar o'chadi. Qaytarib bo'lmaydi. Vaqtincha to'xtatmoqchi bo'lsangiz, o'chirmang, "Maktabni yopish" dan foydalaning.`}
          onYes={removeSchool}
          onNo={() => setSchoolToDelete(null)}
        />
      )}

      {newDir && (
        <Modal title="Yangi direktor" onClose={() => setNewDir(null)}>
          <form onSubmit={createDirector} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Maktab</span>
              <select className={selectCls} value={newDir.school_id} onChange={(e) => setNewDir({ ...newDir, school_id: e.target.value })} required>
                <option value="" disabled>Tanlang</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <Input label="F.I.Sh." value={newDir.full_name} onChange={(e) => setNewDir({ ...newDir, full_name: e.target.value })} required minLength={3} />
            <Input label="Email (kirish uchun)" type="email" value={newDir.email} onChange={(e) => setNewDir({ ...newDir, email: e.target.value })} required />
            <Input label="Parol (bo'sh qoldirsangiz avtomatik)" type="text" value={newDir.password} onChange={(e) => setNewDir({ ...newDir, password: e.target.value })} minLength={8} maxLength={72} />
            <Button type="submit" className="w-full">Yaratish</Button>
          </form>
        </Modal>
      )}

      {creds && (
        <Modal title="Direktor kirish ma'lumotlari" onClose={() => setCreds(null)}>
          <p className="mb-3 text-sm text-slate-500">Parolni hozir yozib oling va direktorga bering. Keyin qayta ko'rsatilmaydi.</p>
          <dl className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <div><dt className="text-xs text-slate-500">Email</dt><dd className="break-all font-mono font-bold">{creds.email}</dd></div>
            <div><dt className="text-xs text-slate-500">Parol</dt><dd className="break-all font-mono font-bold">{creds.password}</dd></div>
          </dl>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog danger title={`${toDelete.full_name} o'chirilsinmi?`} text="Direktor tizimga kira olmaydi. Maktab ma'lumotlari saqlanadi." onYes={removeDirector} onNo={() => setToDelete(null)} />
      )}
    </div>
  );
}

function PeriodPicker({ value, onChange }: { value: number | null; onChange: (d: number | null) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">Ruxsat muddati</p>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            type="button"
            key={p.label}
            onClick={() => onChange(p.days)}
            aria-pressed={value === p.days}
            className={`min-h-[40px] rounded-xl px-3 text-sm font-semibold ${value === p.days ? "bg-brand-600 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
