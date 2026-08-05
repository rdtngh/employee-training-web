import DashboardLayout from "../../components/dashboard/DashboardLayout";
import TrainingHistoryDashboard from "../../components/trainingHistory/TrainingHistoryDashboard";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import * as certificateService from "../../services/certificateService";
import { useServiceData } from "../../hooks/useServiceData";

function CertificatePage() {
  const { data, loading, error, reload } = useServiceData(
    trainingHistoryService.getAdminHistories,
    "superadmin",
    { title: "Riwayat Pelatihan", message: "", histories: [] }
  );
  const { data: certificateData, loading: certificatesLoading } = useServiceData(
    certificateService.getCertificates,
    "superadmin-certificates",
    { certificates: [] }
  );

  return (
    <DashboardLayout role="superadmin">
      <TrainingHistoryDashboard historyData={data} certificateData={certificateData} certificatesLoading={certificatesLoading} loading={loading} error={error} reload={reload} role="superadmin" />
    </DashboardLayout>
  );
}

export default CertificatePage;
