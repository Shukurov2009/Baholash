export type Role = "DIRECTOR" | "TEACHER" | "STUDENT" | "SUPER_ADMIN";

export interface User {
  id: number;
  full_name: string;
  role: Role;
  username?: string | null;
  email?: string | null;
  school_id?: number | null;
  school_name?: string | null;
}

export type Status = "good" | "average" | "critical" | "no_data";
export interface Question {
  id: number;
  text: string;
  order?: number;
}

export interface TeacherBrief {
  id: number;
  full_name: string;
  subject: string;
}

export interface Trend {
  direction: "up" | "down" | "flat";
  delta: number;
}

export interface MonthPoint {
  year: number;
  month: number;
  label: string;
  avg: number;
  count: number;
}

export interface QuestionStat {
  question_id: number;
  text: string;
  avg: number;
}

export interface TeacherRow extends TeacherBrief {
  username: string | null;
  avg: number | null;
  responses: number;
  trend: Trend | null;
  status: Status;
}

export interface TeacherDetail extends TeacherBrief {
  avg: number | null;
  responses: number;
  status: Status;
  questions: QuestionStat[];
  distribution: Record<string, number>;
  series: MonthPoint[];
}

export interface CommentRow {
  code: string;
  question: string | null;
  rating: number | null;
  text: string;
  year: number;
  month: number;
}

export interface Overview {
  teachers_count: number;
  students_count: number;
  voted_count: number;
  participation: number;
  overall_avg: number | null;
  year: number;
  month: number;
  month_name: string;
}

export interface AlertRow {
  teacher_id: number;
  full_name: string;
  subject: string;
  months: MonthPoint[];
}

export interface TeacherSummary {
  full_name: string;
  subject: string;
  avg: number | null;
  responses: number;
  this_month_avg: number | null;
  this_month_count: number;
  questions: QuestionStat[];
  distribution: Record<string, number>;
}

export interface StudentRow {
  id: number;
  full_name: string;
  username: string;
  grade: number | null;
}

export type AccessStatus = "active" | "expired" | "off";

export interface AdminSchool {
  id: number;
  name: string;
  teachers_count: number;
  students_count: number;
  directors: { full_name: string; email: string }[];
  access: {
    status: AccessStatus;
    enabled: boolean;
    until: string | null;
    days_left: number | null;
    paid_amount: number;
  };
}

export interface AdminStats {
  schools_count: number;
  open_schools: number;
  closed_schools: number;
  directors_count: number;
  teachers_count: number;
  students_count: number;
  revenue: number;
  currency: string;
}

export interface AdminDirector {
  id: number;
  full_name: string;
  email: string;
  school_id: number | null;
  school_name: string | null;
}
