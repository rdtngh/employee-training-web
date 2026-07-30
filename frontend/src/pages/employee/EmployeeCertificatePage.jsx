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
  const [downloadError, setDownloadError] = useState("");

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

  async function downloadCertificate() {
    setDownloading(true);
    setDownloadError("");

    try {
      const file = await certificateService.downloadCertificate(trainingId);
      downloadFile(file);
    } catch (error) {
      setDownloadError(
        error.response?.data?.message ||
          error.message ||
          "Sertifikat gagal diunduh. Silakan coba lagi."
      );
    } finally {
      setDownloading(false);
    }
  }

  function printCertificate() {
    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      document.body.classList.remove("is-certificate-printing");
      window.removeEventListener("afterprint", finishPrint);
    };

    window.addEventListener("afterprint", finishPrint);
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <DashboardLayout role="employee">
      <main className="employee-certificate-page">
        <header className="employee-certificate-header">
          <div>
            <h1>Preview Sertifikat</h1>
          </div>
          <div className="employee-certificate-actions">
            {!loading && !error && (
              <>
                <button
                  type="button"
                  className="employee-certificate-download"
                  onClick={downloadCertificate}
                  disabled={downloading}
                >
                  {downloading ? "Mengunduh..." : "Download PDF"}
                </button>
                <button type="button" onClick={printCertificate}>
                  Cetak
                </button>
              </>
            )}
          </div>
        </header>

        {loading && <p className="employee-certificate-state">Memuat sertifikat...</p>}
        {error && (
          <p className="employee-certificate-state employee-certificate-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && (
          <>
            {downloadError && (
              <p className="employee-certificate-download-error" role="alert">
                {downloadError}
              </p>
            )}
            <section className="employee-certificate-stage">
              <Certificate
                employeeName={certificateData.employee_name}
                trainingTitle={certificateData.training_title}
              />
            </section>
          </>
        )}

        <button
          type="button"
          className="employee-certificate-back"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </main>
    </DashboardLayout>
  );
}

export default EmployeeCertificatePage;
