import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "../../components/certificate/Certificate";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as certificateService from "../../services/certificateService";
import { downloadFile } from "../../utils/downloadFile";
import "./EmployeeCertificatePage.css";

const defaultCertificateData = {
  employee_name: "",
  training_title: "",
};

function EmployeeCertificatePage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [certificateData, setCertificateData] = useState(defaultCertificateData);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    certificateService
      .getCertificatePreview(trainingId)
      .then((data) => {
        if (!active) return;
        setCertificateData(data);
        setError("");
      })
      .catch((error) => {
        if (!active) return;
        setError(
          error.response?.data?.message ||
            error.message ||
            "Sertifikat belum dapat dimuat. Silakan coba lagi."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  const downloadCertificate = async () => {
    setDownloading(true);
    setError("");

    try {
      const file = await certificateService.downloadCertificate(trainingId);
      downloadFile(file);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Sertifikat gagal diunduh. Silakan coba lagi."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout role="employee">
      <main className="employee-certificate-page">
        <header className="employee-certificate-header">
          <div>
            <h1>Preview Sertifikat</h1>
            <p>Template penghargaan karyawan siap menerima data dari backend.</p>
          </div>
          <div className="employee-certificate-actions">
            {!loading && !error && (
              <button type="button" onClick={downloadCertificate} disabled={downloading}>
                {downloading ? "Mengunduh..." : "Download Sertifikat"}
              </button>
            )}
            <button type="button" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </header>

        {loading && <p className="employee-certificate-state">Memuat sertifikat...</p>}
        {error && (
          <p className="employee-certificate-state employee-certificate-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className="employee-certificate-stage">
            <Certificate
              employeeName={certificateData.employee_name}
              trainingTitle={certificateData.training_title}
            />
          </section>
        )}
      </main>
    </DashboardLayout>
  );
}

export default EmployeeCertificatePage;
