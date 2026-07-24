import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public
import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/public/LoginPage";

// Employee
import DashboardEmployee from "../pages/employee/DashboardEmployee";
import EmployeeMaterials from "../pages/employee/EmployeeMaterials";
import EmployeePreTest from "../pages/employee/EmployeePreTest";
import EmployeePostTest from "../pages/employee/EmployeePostTest";

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
import ProtectedRoute from "../components/auth/ProtectedRoute";

const protectedPage = (element, allowedRoles) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>

        {/* ================= PUBLIC ================= */}

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ================= EMPLOYEE ================= */}

        <Route
          path="/employee"
          element={protectedPage(<DashboardEmployee />, ["employee"])}
        />

        <Route
          path="/employee/materi"
          element={protectedPage(<EmployeeMaterials />, ["employee"])}
        />

        <Route path="/employee/pretest" element={protectedPage(<EmployeePreTest />, ["employee"])} />
        <Route path="/employee/posttest" element={protectedPage(<EmployeePostTest />, ["employee"])} />


        {/* ================= ADMIN ================= */}

        <Route
          path="/admin"
          element={protectedPage(<DashboardAdmin />, ["admin"])}
        />

        <Route
          path="/admin/manage-exam"
          element={protectedPage(<ManageExamAdmin />, ["admin"])}
        />

        <Route
          path="/admin/manage-materi"
          element={protectedPage(<ManageMaterialAdmin />, ["admin"])}
        />

        <Route path="/admin/exam-results" element={protectedPage(<ExamResultAdmin />, ["admin"])} />
        <Route path="/admin/statistics" element={protectedPage(<StatisticsPageAdmin />, ["admin"])} />
        <Route path="/admin/certificates" element={protectedPage(<CertificatePageAdmin />, ["admin"])} />


        {/* ================= SUPER ADMIN ================= */}

        <Route
          path="/superadmin"
          element={protectedPage(<DashboardSuperAdmin />, ["superadmin"])}
        />

        <Route
          path="/superadmin/manage-user"
          element={protectedPage(<UserManagement />, ["superadmin"])}
        />

        <Route
          path="/superadmin/manage-exam"
          element={protectedPage(<ManageExamSuperAdmin />, ["superadmin"])}
        />

        <Route
          path="/superadmin/manage-materi"
          element={protectedPage(<ManageMaterialSuperAdmin />, ["superadmin"])}
        />

        <Route path="/superadmin/exam-results" element={protectedPage(<ExamResultSuperAdmin />, ["superadmin"])} />
        <Route path="/superadmin/statistics" element={protectedPage(<StatisticsPageSuperAdmin />, ["superadmin"])} />
        <Route path="/superadmin/certificates" element={protectedPage(<CertificatePageSuperAdmin />, ["superadmin"])} />


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
