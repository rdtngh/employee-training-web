import DashboardLayout from "../../components/dashboard/DashboardLayout";
import CertificateDashboard from "../../components/certificate/CertificateDashboard";
import * as certificateService from "../../services/certificateService";
import { useServiceData } from "../../hooks/useServiceData";

function CertificatePage() {
  const { data: certificateData, loading, error } = useServiceData(
    certificateService.getCertificates,
    "superadmin",
    { title: "Sertifikat", message: "", certificates: [] }
  );

  return (
    <DashboardLayout role="superadmin">
      <CertificateDashboard certificateData={certificateData} loading={loading} error={error} />
    </DashboardLayout>
  );
}

export default CertificatePage;
