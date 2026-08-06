import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Certificate from "./Certificate";
import * as certificateService from "../../services/certificateService";
import {
  buildCertificatePngFilename,
  downloadCertificateAsPng,
} from "../../utils/downloadCertificateAsPng";
import "../../pages/employee/EmployeeCertificatePage.css";

function AdminCertificatePreview() {
  const navigate = useNavigate();
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    certificateService
      .getAdminCertificatePreview(certificateId)
      .then((data) => active && setCertificate(data))
      .catch((previewError) => {
        if (active) {
          setError(previewError.response?.data?.message || "Sertifikat gagal dimuat.");
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [certificateId]);

  const pngPayload = certificate ? {
    employee_name: certificate.employee?.name,
    training_title: certificate.training?.title,
    certificate_number: certificate.certificate_number,
    sequence_number: certificate.sequence_number,
    roman_month: certificate.roman_month,
    year: certificate.year,
    completion_date: certificate.completion_date || certificate.issued_at,
    certificate_template: certificate.training?.certificate_template,
  } : null;

  async function downloadCertificate() {
    if (!pngPayload) return;
    setDownloading(true);
    setError("");
    try {
      if (certificate.training?.is_general_orientation) {
        certificateService.saveCertificateBlob(
          await certificateService.downloadCertificateFile(certificate.id)
        );
      } else {
        await downloadCertificateAsPng(
          pngPayload,
          buildCertificatePngFilename(pngPayload, certificate.training?.id)
        );
      }
    } catch (downloadError) {
      setError(downloadError.message || "Sertifikat gagal didownload.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="employee-certificate-page">
      <header className="employee-certificate-header">
        <div><h1>Preview Sertifikat</h1></div>
        {!loading && !error && (
          <button type="button" className="employee-certificate-download" onClick={downloadCertificate} disabled={downloading}>
            {downloading ? "Mengunduh..." : "Download Sertifikat"}
          </button>
        )}
      </header>
      {loading && <p className="employee-certificate-state">Memuat sertifikat...</p>}
      {error && <p className="employee-certificate-state employee-certificate-error" role="alert">{error}</p>}
      {!loading && !error && certificate && (
        <section className="employee-certificate-stage">
          {certificate.training?.is_general_orientation ? (
            <p className="employee-certificate-state">
              Sertifikat Orientasi Umum terdiri dari dua halaman dan tersedia sebagai PDF.
            </p>
          ) : <Certificate
            employeeName={certificate.employee?.name}
            trainingTitle={certificate.training?.title}
            certificateNumber={certificate.certificate_number}
            sequenceNumber={certificate.sequence_number}
            romanMonth={certificate.roman_month}
            year={certificate.year}
            completionDate={certificate.completion_date || certificate.issued_at}
            certificateTemplate={certificate.training?.certificate_template}
          />}
        </section>
      )}
      <button type="button" className="employee-certificate-back" onClick={() => navigate(-1)}>Back</button>
    </main>
  );
}

export default AdminCertificatePreview;
