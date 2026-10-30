import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { errorMessage, get } from "../../api/client";
import { Button, Card, CommentField, Spinner, StarRating, useToast } from "../../components/ui";
import { t } from "../../i18n";
import type { Question, TeacherBrief } from "../../types";
import { Draft, LOW_SCORE, MIN_COMMENT, loadDraft, saveDraft } from "./draft";

/** Savollar bir-bir ko'rsatiladi, yuqorida progress. 3 dan past baho → izoh majburiy. */
export default function StudentVote() {
  const { teacherId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [teacher, setTeacher] = useState<TeacherBrief | null>(null);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(teacherId));
  const [step, setStep] = useState(0);

  useEffect(() => {
    Promise.all([
      get<Question[]>("/student/questions"),
      get<TeacherBrief[]>("/student/teachers"),
      get<{ voted: boolean }>("/student/vote-status"),
    ])
      .then(([qs, ts, vs]) => {
        if (vs.voted) {
          toast("Bu oy allaqachon baho bergansiz", "error");
          navigate("/student/teachers", { replace: true });
          return;
        }
        const tr = ts.find((x) => String(x.id) === teacherId);
        if (!tr) {
          navigate("/student/teachers", { replace: true });
          return;
        }
        setTeacher(tr);
        setQuestions(qs);
        // Qoralamada javob berilgan savollardan keyingisidan davom etamiz.
        const d = loadDraft(teacherId);
        const firstOpen = qs.findIndex((q) => d.scores[q.id] === undefined);
        setStep(firstOpen === -1 ? Math.max(qs.length - 1, 0) : firstOpen);
      })
      .catch((e) => {
        toast(errorMessage(e), "error");
        navigate("/student/teachers", { replace: true });
      });
  }, [teacherId, navigate, toast]);

  if (!questions || !teacher) return <Spinner />;
  if (questions.length === 0) return <p className="py-10 text-center">So'rovnoma savollari sozlanmagan.</p>;

  const q = questions[step];
  const score = draft.scores[q.id] ?? null;
  const comment = draft.comments[q.id] ?? "";
  const needsComment = score !== null && score < LOW_SCORE;
  const canNext = score !== null && (!needsComment || comment.trim().length >= MIN_COMMENT);
  const isLast = step === questions.length - 1;

  function update(next: Draft) {
    setDraft(next);
    saveDraft(teacherId, next);
  }

  function setScore(v: number) {
    const comments = { ...draft.comments };
    if (v >= LOW_SCORE) delete comments[q.id]; // yuqori bahoda izoh maydoni yo'q
    update({ ...draft, scores: { ...draft.scores, [q.id]: v }, comments });
  }

  function next() {
    if (!canNext) return;
    if (isLast) navigate(`/student/summary/${teacherId}`);
    else setStep(step + 1);
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm text-slate-500">{teacher.full_name} · {teacher.subject}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Progress">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Savol {step + 1} / {questions.length}</p>
      </div>

      <Card className="space-y-6 text-center">
        <h1 className="text-xl font-bold leading-snug">{q.text}</h1>
        <StarRating value={score} onChange={setScore} size="lg" />
        {needsComment && (
          <CommentField
            required
            label="Izoh"
            value={comment}
            onChange={(v) => update({ ...draft, comments: { ...draft.comments, [q.id]: v } })}
            hint={`Nega shu baho? (kamida ${MIN_COMMENT} belgi)`}
          />
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t("back")}
        </Button>
        <Button className="flex-1" disabled={!canNext} onClick={next}>
          {isLast ? "Yakunlash" : t("next")}
        </Button>
      </div>
    </div>
  );
}
