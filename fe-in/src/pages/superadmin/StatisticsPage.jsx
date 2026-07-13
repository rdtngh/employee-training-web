import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { ExamResultPlaceholder } from "../../components/exam/ExamResult";

function StatisticsPage() {
  return (
    <DashboardLayout role="superadmin">
      <ExamResultPlaceholder
        title="Statistik"
        message="Grafik statistik hasil pre-test dan post-test akan ditampilkan di sini."
      />
    </DashboardLayout>
  );
}

export default StatisticsPage;
