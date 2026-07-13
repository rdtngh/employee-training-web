import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { ExamResultPlaceholder } from "../../components/exam/ExamResult";
import * as statisticsService from "../../services/statisticsService";
import { useServiceData } from "../../hooks/useServiceData";

function StatisticsPage() {
  const { data: statistics } = useServiceData(
    statisticsService.getStatistics,
    "superadmin",
    { title: "", message: "" }
  );

  return (
    <DashboardLayout role="superadmin">
      <ExamResultPlaceholder
        title={statistics.title}
        message={statistics.message}
      />
    </DashboardLayout>
  );
}

export default StatisticsPage;
