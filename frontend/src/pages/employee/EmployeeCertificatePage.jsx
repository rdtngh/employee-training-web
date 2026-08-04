import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "../../components/certificate/Certificate";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as certificateService from "../../services/certificateService";
import { downloadElementAsPng } from "../../utils/downloadElementAsPng";
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

const buildCertificateFilename = (certificateData) => {
  const name = String(certificateData.employee_name || "sertifikat")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${name || "sertifikat"}-${certificateData.training_id || "pelatihan"}.png`;
};

function EmployeeCertificatePage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const downloadSourceRef = useRef(null);
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
    setDownloadError("");
    setDownloading(true);

    try {
      const certificateElement = downloadSourceRef.current?.querySelector(".certificate-template");

      await downloadElementAsPng(
        certificateElement,
        buildCertificateFilename({ ...certificateData, training_id: trainingId }),
        {
          width: 841,
          height: 595,
          pixelRatio: 2,
        }
      );
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
          </section>
        )}
        {!loading && !error && (
          <div
            className="employee-certificate-download-source"
            ref={downloadSourceRef}
            aria-hidden="true"
          >
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
          </div>
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
