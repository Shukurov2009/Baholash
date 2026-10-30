import { FormEvent, useState } from "react";
import { errorMessage, post } from "../../api/client";
import { Button, Card, Input, useToast } from "../../components/ui";
import type { LicenseInfo } from "../../types";

const STATUS_TEXT: Record<string, string> = {
  none: "Maktabingizga litsenziya biriktirilmagan.",
  inactive: "Litsenziya hali faollashtirilmagan.",
  expired: "Litsenziya muddati tugagan.",
  active: "Litsenziya faol.",
};

export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("uz-UZ") : "—");

/** Litsenziya holati va kalit orqali faollashtirish. Direktor litsenziyasiz ham shu yerga kira oladi. */
export default function LicenseActivate({ license, onDone }: { license: LicenseInfo; onDone: () => void }) {
  const toast = useToast();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post("/director/license/activate", { key: key.trim() });
      toast("Litsenziya faollashtirildi");
      setKey("");
      onDone();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold">Litsenziya</h2>
        <p className="text-sm text-slate-500">{STATUS_TEXT[license.status]}</p>
      </div>
      {license.status !== "none" && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Tarif</dt><dd className="font-medium">{license.plan ?? "—"}</dd>
          <dt className="text-slate-500">Faollashgan</dt><dd className="font-medium">{fmtDate(license.activated_at)}</dd>
          <dt className="text-slate-500">Tugash sanasi</dt><dd className="font-medium">{fmtDate(license.expires_at)}</dd>
        </dl>
      )}
      <form onSubmit={submit} className="space-y-3">
        <Input label="Litsenziya kaliti" value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required minLength={8} />
        <Button type="submit" className="w-full" disabled={busy}>Faollashtirish</Button>
      </form>
    </Card>
  );
}
