import { FormEvent, useCallback, useEffect, useState } from "react";
import { del, errorMessage, get, post } from "../../api/client";
import {
  Button, Column, ConfirmDialog, DataTable, Input, Modal, Spinner, StatCard, useToast,
} from "../../components/ui";
import type { AdminDirector, AdminSchool, AdminStats } from "../../types";

const selectCls =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900";

/** Super admin: maktablar va direktorlar. Direktor hisobini faqat shu yerdan ochish mumkin. */
export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [directors, setDirectors] = useState<AdminDirector[]>([]);
  const [newSchool, setNewSchool] = useState<{ name: string } | null>(null);
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
      await post("/admin/schools", { name: newSchool.name });
      toast("Maktab yaratildi");
      setNewSchool(null);
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
    { key: "name", header: "Maktab", render: (s) => <span className="font-medium">{s.name}</span> },
    { key: "people", header: "O'qituvchilar / O'quvchilar", render: (s) => `${s.teachers_count} / ${s.students_count}` },
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
        <StatCard label="Maktablar" value={stats.schools_count} />
        <StatCard label="Direktorlar" value={stats.directors_count} />
        <StatCard label="O'qituvchilar" value={stats.teachers_count} />
        <StatCard label="O'quvchilar" value={stats.students_count} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Maktablar</h2>
          <Button variant="secondary" onClick={() => setNewSchool({ name: "" })}>+ Maktab qo'shish</Button>
        </div>
        <DataTable columns={schoolCols} rows={schools} empty="Maktablar yo'q. Avval maktab qo'shing." />
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
            <Input label="Maktab nomi" value={newSchool.name} onChange={(e) => setNewSchool({ name: e.target.value })} required minLength={2} />
            <Button type="submit" className="w-full">Yaratish</Button>
          </form>
        </Modal>
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
