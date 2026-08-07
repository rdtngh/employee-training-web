import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "../../components/certificate/Certificate";
import CertificatePdfPreview from "../../components/certificate/CertificatePdfPreview";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as certificateService from "../../services/certificateService";
import {
  buildCertificatePngFilename,
  downloadCertificateAsPng,
} from "../../utils/downloadCertificateAsPng";
import "./EmployeeCertificatePage.css";

const defaultCertificateData = {
  employee_name: "",
  training_title: "",
  certificate_number: "",
  sequence_number: "",
  roman_month: "",
  year: "",
  completion_date: "",
};

function EmployeeCertificatePage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [certificateData, setCertificateData] = useState(defaultCertificateData);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const loadPdfPreview = useCallback(
    () => certificateService.downloadCertificate(trainingId),
    [trainingId]
  );

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
    setDownloadError("");
    setDownloading(true);

    try {
      if (certificateData.is_general_orientation) {
        certificateService.saveCertificateBlob(
          await certificateService.downloadCertificate(trainingId)
        );
      } else {
        await downloadCertificateAsPng(
          certificateData,
          buildCertificatePngFilename(certificateData, trainingId)
        );
      }
    } catch (error) {
      setDownloadError(
        error.message || "Sertifikat gagal didownload. Silakan coba lagi."
      );
    } finally {
      setDownloading(false);
    }
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
              <button
                type="button"
                className="employee-certificate-download"
                onClick={downloadCertificate}
                disabled={downloading}
              >
                {downloading ? "Mengunduh..." : "Download Sertifikat"}
              </button>
            )}
          </div>
        </header>

        {loading && <p className="employee-certificate-state">Memuat sertifikat...</p>}
        {error && (
          <p className="employee-certificate-state employee-certificate-error" role="alert">
            {error}
          </p>
        )}
        {downloadError && (
          <p className="employee-certificate-alert" role="alert">
            {downloadError}
          </p>
        )}
        {!loading && !error && (
          <section className="employee-certificate-stage">
            {certificateData.is_general_orientation ? (
              <CertificatePdfPreview loadPdf={loadPdfPreview} />
            ) : (
              <Certificate
                employeeName={certificateData.employee_name}
                trainingTitle={certificateData.training_title}
                certificateNumber={certificateData.certificate_number}
                sequenceNumber={certificateData.sequence_number}
                romanMonth={certificateData.roman_month}
                year={certificateData.year}
                completionDate={certificateData.completion_date || certificateData.issued_at}
                certificateTemplate={certificateData.certificate_template}
              />
            )}
          </section>
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
