import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamResult from "../../components/exam/ExamResult";

function SuperAdminExamResult() {
  return (
    <DashboardLayout role="superadmin">
      <ExamResult role="superadmin" />
    </DashboardLayout>
  );
}

export default SuperAdminExamResult;
