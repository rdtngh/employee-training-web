import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { ExamResultPlaceholder } from "../../components/exam/ExamResult";

function CertificatePage() {
  return (
    <DashboardLayout role="admin">
      <ExamResultPlaceholder
        title="Sertifikat"
        message="Daftar sertifikat peserta yang telah lulus pelatihan akan ditampilkan di sini."
      />
    </DashboardLayout>
  );
}

export default CertificatePage;
