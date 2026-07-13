import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamResult from "../../components/exam/ExamResult";

function AdminExamResult() {
  return (
    <DashboardLayout role="admin">
      <ExamResult role="admin" />
    </DashboardLayout>
  );
}

export default AdminExamResult;
