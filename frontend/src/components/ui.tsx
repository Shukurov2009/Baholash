import {
  ButtonHTMLAttributes, createContext, InputHTMLAttributes, ReactNode, useCallback, useContext, useEffect, useState,
} from "react";
import type { Status } from "../types";
import { t } from "../i18n";

export function cx(...a: (string | false | null | undefined)[]): string {
  return a.filter(Boolean).join(" ");
}

export const fmt = (n: number | null | undefined, digits = 2): string =>
  n === null || n === undefined ? "—" : n.toFixed(digits);

// ------------------------------------------------------------------ Button / Input / Card
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
export function Button({
  variant = "primary", className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700",
    secondary: "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-slate-500",
        styles[variant], className,
      )}
    />
  );
}

export function Input({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <input
        {...p}
        className={cx(
          "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          className,
        )}
      />
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800", className)}>
      {children}
    </div>
  );
}

export function Spinner({ text = t("loading") }: { text?: string }) {
  return <p className="py-10 text-center text-slate-500">{text}</p>;
}

// ------------------------------------------------------------------ StarRating
interface StarProps {
  value: number | null;
  onChange?: (v: number) => void; // berilsa — kiritish rejimi
  size?: "md" | "lg";
}
export function StarRating({ value, onChange, size = "md" }: StarProps) {
  const px = size === "lg" ? "text-5xl" : "text-2xl";
  if (onChange) {
    return (
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="Baho">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} yulduz`}
            onClick={() => onChange(n)}
            className={cx(
              "h-14 w-14 rounded-xl text-4xl transition active:scale-90 sm:h-16 sm:w-16 sm:text-5xl",
              value !== null && n <= value ? "text-amber-400" : "text-slate-300 dark:text-slate-700",
            )}
          >
            ★
          </button>
        ))}
      </div>
    );
  }
  // Ko'rsatish rejimi: kasr qismli (masalan 4.3) yulduzlar — ustiga kesilgan qatlam qo'yiladi.
  const pct = Math.max(0, Math.min(5, value ?? 0)) * 20;
  return (
    <span className={cx("relative inline-block leading-none", px)} aria-label={`${fmt(value, 1)} / 5`}>
      <span className="text-slate-300 dark:text-slate-700">★★★★★</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

// ------------------------------------------------------------------ CommentField
export function CommentField({
  value, onChange, required, label, hint,
}: { value: string; onChange: (v: string) => void; required?: boolean; label: string; hint?: string }) {
  return (
    <label className="block text-left">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium">
        {label}
        {required && (
          <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
            MAJBURIY
          </span>
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

// ------------------------------------------------------------------ StatusBadge / StatCard / EmptyState
export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    good: [t("statusGood"), "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"],
    average: [t("statusAverage"), "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"],
    critical: [t("statusCritical"), "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"],
    no_data: [t("noData"), "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"],
  };
  const [label, cls] = map[status];
  return <span className={cx("inline-block rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>{label}</span>;
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ icon = "📭", title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <div className="text-4xl">{icon}</div>
      <p className="mt-2 font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ DataTable
export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}
export function DataTable<T extends { id: number | string }>({
  columns, rows, onRowClick, empty = "Ma'lumot yo'q",
}: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; empty?: string }) {
  if (rows.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>{columns.map((c) => <th key={c.key} className={cx("px-4 py-3 font-semibold", c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60")}
            >
              {columns.map((c) => <td key={c.key} className={cx("px-4 py-3", c.className)}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ Modal / ConfirmDialog
export function Modal({
  title, onClose, children, side = false,
}: { title: string; onClose: () => void; children: ReactNode; side?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={cx("fixed inset-0 z-50 flex bg-slate-900/50", side ? "justify-end" : "items-center justify-center p-4")} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-900",
          side ? "h-full w-full max-w-xl" : "max-h-full w-full max-w-md rounded-2xl",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t("close")} className="rounded-lg px-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title, text, onYes, onNo, busy, danger,
}: { title: string; text?: string; onYes: () => void; onNo: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <Modal title={title} onClose={onNo}>
      {text && <p className="mb-5 text-slate-600 dark:text-slate-300">{text}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onNo}>{t("no")}</Button>
        <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onYes} disabled={busy}>{t("yes")}</Button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Toast
type ToastKind = "ok" | "error";
interface ToastItem { id: number; text: string; kind: ToastKind }
const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, kind }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((i) => (
          <div
            key={i.id}
            role="status"
            className={cx(
              "pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg",
              i.kind === "ok" ? "bg-emerald-600" : "bg-red-600",
            )}
          >
            {i.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
