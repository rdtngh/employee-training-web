import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Certificate from "./Certificate";
import "./CertificateDashboard.css";

function CertificateDashboard({ certificateData, loading, error }) {
  const navigate = useNavigate();
  const [printingCertificate, setPrintingCertificate] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const certificates = certificateData?.certificates ?? [];
  const printingId = printingCertificate?.id ?? null;

  useEffect(() => {
    if (!printingCertificate) return undefined;

    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      document.body.classList.remove("is-certificate-printing");
      setPrintingCertificate(null);
    };

    window.addEventListener("afterprint", finishPrint);

    const timer = window.setTimeout(() => {
      window.print();
    }, 100);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finishPrint);
      document.body.classList.remove("is-certificate-printing");
    };
  }, [printingCertificate]);

  function downloadCertificate(certificate) {
    setDownloadError("");
    setPrintingCertificate(certificate);
  }

  return (
    <main className="certificate-page">
      <header className="certificate-header">
        <div>
          <h1>{certificateData?.title || "Sertifikat"}</h1>
          <p>{certificateData?.message || "Daftar peserta yang telah lulus pelatihan."}</p>
        </div>
      </header>

      {loading && <p className="certificate-state">Memuat sertifikat...</p>}
      {error && (
        <p className="certificate-state certificate-error" role="alert">
          Data sertifikat gagal dimuat.
        </p>
      )}
      {downloadError && (
        <p className="certificate-alert" role="alert">
          {downloadError}
        </p>
      )}

      {!loading && !error && (
        <section className="certificate-card">
          <div className="certificate-table-wrap">
            <table className="certificate-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Peserta</th>
                  <th>ID Karyawan</th>
                  <th>Pelatihan</th>
                  <th>Skor</th>
                  <th>No Sertifikat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="certificate-empty">
                      Belum ada peserta yang lulus pelatihan.
                    </td>
                  </tr>
                ) : (
                  certificates.map((certificate, index) => (
                    <tr key={certificate.id}>
                      <td data-label="No">{index + 1}</td>
                      <td data-label="Nama Peserta">{certificate.employee?.name || "-"}</td>
                      <td data-label="ID Karyawan">{certificate.employee?.employee_number || "-"}</td>
                      <td data-label="Pelatihan">{certificate.training?.title || "-"}</td>
                      <td data-label="Skor">{certificate.result?.score ?? "-"}</td>
                      <td data-label="No Sertifikat">{certificate.certificate_number}</td>
                      <td data-label="Aksi">
                        <button
                          type="button"
                          className="certificate-download"
                          onClick={() => downloadCertificate(certificate)}
                          disabled={printingId === certificate.id}
                        >
                          {printingId === certificate.id ? "Menyiapkan..." : "Download PDF"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <button type="button" className="certificate-back" onClick={() => navigate(-1)}>
        Back
      </button>

      {printingCertificate && (
        <section className="certificate-print-stage" aria-hidden="true">
          <Certificate
            employeeName={printingCertificate.employee?.name}
            trainingTitle={printingCertificate.training?.title}
          />
        </section>
      )}
    </main>
  );
}

export default CertificateDashboard;
