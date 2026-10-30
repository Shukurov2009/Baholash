import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { errorMessage, get, post } from "../../api/client";
import { Button, Card, CommentField, ConfirmDialog, Spinner, StarRating, useToast } from "../../components/ui";
import { t } from "../../i18n";
import type { Question } from "../../types";
import { LOW_SCORE, clearDraft, loadDraft, saveDraft } from "./draft";

export default function StudentSummary() {
  const { teacherId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [general, setGeneral] = useState(() => loadDraft(teacherId).general);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<Question[]>("/student/questions").then(setQuestions).catch((e) => toast(errorMessage(e), "error"));
  }, [toast]);

  if (!questions) return <Spinner />;
  const draft = loadDraft(teacherId);
  // Hamma savolga javob berilmagan bo'lsa — so'rovnomaga qaytaramiz.
  if (questions.some((q) => draft.scores[q.id] === undefined)) return <Navigate to={`/student/vote/${teacherId}`} replace />;

  const values = questions.map((q) => draft.scores[q.id]);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  async function send() {
    setBusy(true);
    try {
      // Faqat 3 dan past ballar uchun izoh yuboriladi.
      const comments: Record<number, string> = {};
      for (const q of questions!) {
        if (draft.scores[q.id] < LOW_SCORE) comments[q.id] = (draft.comments[q.id] ?? "").trim();
      }
      await post("/student/evaluations", {
        teacher_id: Number(teacherId),
        scores: draft.scores,
        comments,
        general_comment: general.trim(),
      });
      await post("/student/submit", { teacher_id: Number(teacherId) });
      clearDraft(teacherId);
      navigate("/student/done", { replace: true });
    } catch (e) {
      toast(errorMessage(e), "error");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Natijangiz</h1>
      <Card className="space-y-3 text-center">
        <p className="text-sm text-slate-500">O'rtacha baho</p>
        <p className="text-5xl font-extrabold">{avg.toFixed(1)}</p>
        <StarRating value={avg} size="lg" />
      </Card>
      <Card>
        <CommentField
          label="Umumiy izoh (ixtiyoriy)"
          value={general}
          onChange={(v) => { setGeneral(v); saveDraft(teacherId, { ...draft, general: v }); }}
          hint="Izohingiz o'qituvchiga ko'rsatilmaydi va sizning ismingiz bilan bog'lanmaydi."
        />
      </Card>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(`/student/vote/${teacherId}`)}>{t("back")}</Button>
        <Button className="flex-1" onClick={() => setConfirm(true)}>{t("send")}</Button>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Natijani yuborishga rozimisiz?"
          text="Yuborilgandan keyin o'zgartirib bo'lmaydi. Bu oy boshqa o'qituvchiga baho bera olmaysiz."
          busy={busy}
          onYes={send}
          onNo={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
