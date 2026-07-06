import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public
import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/auth/LoginPage";

// Employee
import DashboardEmployee from "../pages/employee/Dashboard";
import Materi from "../pages/employee/Materi";
import PreTest from "../pages/employee/PreTest";
import PostTest from "../pages/employee/PostTest";
import Result from "../pages/employee/Result";

// Admin
import DashboardAdmin from "../pages/admin/Dashboard";
import ManageMateri from "../pages/admin/ManageMateri";
import ManageExam from "../pages/admin/ManageExam";
import ManageTraining from "../pages/admin/ManageTraining";

// Super Admin
import DashboardSuperAdmin from "../pages/superadmin/Dashboard";
import ManageUser from "../pages/superadmin/ManageUser";
import ManageMateriSuper from "../pages/superadmin/ManageMateri";
import ManageExamSuper from "../pages/superadmin/ManageExam";
import ManageTrainingSuper from "../pages/superadmin/ManageTraining";

// Error Page
import NotFoundPage from "../pages/NotFoundPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Employee */}
        <Route path="/employee/dashboard" element={<DashboardEmployee />} />
        <Route path="/employee/materi" element={<Materi />} />
        <Route path="/employee/pretest" element={<PreTest />} />
        <Route path="/employee/posttest" element={<PostTest />} />
        <Route path="/employee/result" element={<Result />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/manage-materi" element={<ManageMateri />} />
        <Route path="/admin/manage-exam" element={<ManageExam />} />
        <Route path="/admin/manage-training" element={<ManageTraining />} />

        {/* Super Admin */}
        <Route path="/superadmin/dashboard" element={<DashboardSuperAdmin />} />
        <Route path="/superadmin/manage-user" element={<ManageUser />} />
        <Route path="/superadmin/manage-materi" element={<ManageMateriSuper />} />
        <Route path="/superadmin/manage-exam" element={<ManageExamSuper />} />
        <Route path="/superadmin/manage-training" element={<ManageTrainingSuper />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;