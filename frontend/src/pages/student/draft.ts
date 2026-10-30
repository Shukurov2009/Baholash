// So'rovnoma qoralamasi (sessionStorage): sahifa yangilansa ham javoblar yo'qolmaydi,
// serverga esa faqat oxirida, tasdiqlangandan keyin yuboriladi.
export interface Draft {
  scores: Record<number, number>;
  comments: Record<number, string>;
  general: string;
}

const key = (teacherId: string) => `baholash_draft_${teacherId}`;

export function loadDraft(teacherId: string): Draft {
  try {
    const raw = sessionStorage.getItem(key(teacherId));
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    /* e'tiborsiz */
  }
  return { scores: {}, comments: {}, general: "" };
}

export function saveDraft(teacherId: string, d: Draft) {
  try {
    sessionStorage.setItem(key(teacherId), JSON.stringify(d));
  } catch {
    /* e'tiborsiz */
  }
}

export function clearDraft(teacherId: string) {
  try {
    sessionStorage.removeItem(key(teacherId));
  } catch {
    /* e'tiborsiz */
  }
}

export const MIN_COMMENT = 5;
export const LOW_SCORE = 3; // shundan past bo'lsa izoh majburiy
