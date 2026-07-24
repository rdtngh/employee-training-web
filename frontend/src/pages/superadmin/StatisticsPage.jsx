import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatisticsDashboard from "../../components/statistics/StatisticsDashboard";
import * as statisticsService from "../../services/statisticsService";
import { useServiceData } from "../../hooks/useServiceData";

function StatisticsPage() {
  const { data: statistics, loading, error, reload } = useServiceData(
    statisticsService.getStatistics,
    "superadmin",
    null
  );

  return (
    <DashboardLayout role="superadmin">
      <StatisticsDashboard
        statistics={statistics}
        loading={loading}
        error={error}
        onReset={reload}
        canReset
      />
    </DashboardLayout>
  );
}

export default StatisticsPage;
