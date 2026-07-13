import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { ExamResultPlaceholder } from "../../components/exam/ExamResult";
import * as certificateService from "../../services/certificateService";
import { useServiceData } from "../../hooks/useServiceData";

function CertificatePage() {
  const { data: certificateData } = useServiceData(
    certificateService.getCertificates,
    "admin",
    { title: "", message: "" }
  );

  return (
    <DashboardLayout role="admin">
      <ExamResultPlaceholder
        title={certificateData.title}
        message={certificateData.message}
      />
    </DashboardLayout>
  );
}

export default CertificatePage;
