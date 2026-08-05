import DashboardLayout from "../../components/dashboard/DashboardLayout";
import TrainingHistoryDashboard from "../../components/trainingHistory/TrainingHistoryDashboard";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import { useServiceData } from "../../hooks/useServiceData";

function CertificatePage() {
  const { data, loading, error, reload } = useServiceData(
    trainingHistoryService.getAdminHistories,
    "superadmin",
    { title: "Riwayat Pelatihan", message: "", histories: [] }
  );

  return (
    <DashboardLayout role="superadmin">
      <TrainingHistoryDashboard historyData={data} loading={loading} error={error} reload={reload} />
    </DashboardLayout>
  );
}

export default CertificatePage;
