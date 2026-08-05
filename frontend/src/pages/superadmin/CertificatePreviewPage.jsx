import DashboardLayout from "../../components/dashboard/DashboardLayout";
import AdminCertificatePreview from "../../components/certificate/AdminCertificatePreview";

function CertificatePreviewPage() {
  return <DashboardLayout role="superadmin"><AdminCertificatePreview /></DashboardLayout>;
}

export default CertificatePreviewPage;
