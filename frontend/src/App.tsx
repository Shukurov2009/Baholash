import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout, { NavItem } from "./layouts/AppLayout";
import { t } from "./i18n";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentTeachers from "./pages/student/Teachers";
import StudentVote from "./pages/student/Vote";
import StudentSummary from "./pages/student/Summary";
import StudentDone from "./pages/student/Done";
import DirectorDashboard from "./pages/director/Dashboard";
import DirectorSettings from "./pages/director/Settings";
import TeacherDashboard from "./pages/teacher/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

const studentNav: NavItem[] = [{ to: "/student/teachers", label: t("teachers") }];
const teacherNav: NavItem[] = [{ to: "/teacher", label: t("dashboard"), end: true }];
const directorNav: NavItem[] = [
  { to: "/director", label: t("dashboard"), end: true },
  { to: "/director/settings", label: t("settings") },
];
const adminNav: NavItem[] = [{ to: "/admin", label: t("dashboard"), end: true }];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/register/:role" element={<Register />} />

      <Route element={<AppLayout role="STUDENT" nav={studentNav} />}>
        <Route path="/student/teachers" element={<StudentTeachers />} />
        <Route path="/student/vote/:teacherId" element={<StudentVote />} />
        <Route path="/student/summary/:teacherId" element={<StudentSummary />} />
        <Route path="/student/done" element={<StudentDone />} />
      </Route>

      <Route element={<AppLayout role="TEACHER" nav={teacherNav} />}>
        <Route path="/teacher" element={<TeacherDashboard />} />
      </Route>

      <Route element={<AppLayout role="DIRECTOR" nav={directorNav} />}>
        <Route path="/director" element={<DirectorDashboard />} />
        <Route path="/director/settings" element={<DirectorSettings />} />
      </Route>

      <Route element={<AppLayout role="SUPER_ADMIN" nav={adminNav} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
