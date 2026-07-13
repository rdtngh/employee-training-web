import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public
import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/public/LoginPage";

// Employee
import DashboardEmployee from "../pages/employee/DashboardEmployee";

// Admin
import DashboardAdmin from "../pages/admin/DashboardAdmin";
import ManageMaterialAdmin from "../pages/admin/ManageMaterial";
import ManageExamAdmin from "../pages/admin/ManageExam";
import ExamResultAdmin from "../pages/admin/ExamResult";
import StatisticsPageAdmin from "../pages/admin/StatisticsPage";
import CertificatePageAdmin from "../pages/admin/CertificatePage";

// Super Admin
import DashboardSuperAdmin from "../pages/superadmin/DashboardSuperAdmin";
import UserManagement from "../pages/superadmin/UserManagement";
import ManageMaterialSuperAdmin from "../pages/superadmin/ManageMaterial";
import ManageExamSuperAdmin from "../pages/superadmin/ManageExam";
import ExamResultSuperAdmin from "../pages/superadmin/ExamResult";
import StatisticsPageSuperAdmin from "../pages/superadmin/StatisticsPage";
import CertificatePageSuperAdmin from "../pages/superadmin/CertificatePage";

// Error Page
import NotFoundPage from "../pages/NotFoundPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ================= EMPLOYEE ================= */}

        <Route
          path="/employee"
          element={<DashboardEmployee />}
        />


        {/* ================= ADMIN ================= */}

        <Route
          path="/admin"
          element={<DashboardAdmin />}
        />

        <Route
          path="/admin/manage-exam"
          element={<ManageExamAdmin />}
        />

        <Route
          path="/admin/manage-materi"
          element={<ManageMaterialAdmin />}
        />

        <Route path="/admin/exam-results" element={<ExamResultAdmin />} />
        <Route path="/admin/statistics" element={<StatisticsPageAdmin />} />
        <Route path="/admin/certificates" element={<CertificatePageAdmin />} />


        {/* ================= SUPER ADMIN ================= */}

        <Route
          path="/superadmin"
          element={<DashboardSuperAdmin />}
        />

        <Route
          path="/superadmin/manage-user"
          element={<UserManagement />}
        />

        <Route
          path="/superadmin/manage-exam"
          element={<ManageExamSuperAdmin />}
        />

        <Route
          path="/superadmin/manage-materi"
          element={<ManageMaterialSuperAdmin />}
        />

        <Route path="/superadmin/exam-results" element={<ExamResultSuperAdmin />} />
        <Route path="/superadmin/statistics" element={<StatisticsPageSuperAdmin />} />
        <Route path="/superadmin/certificates" element={<CertificatePageSuperAdmin />} />


        {/* ================= 404 ================= */}

        <Route
          path="*"
          element={<NotFoundPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
