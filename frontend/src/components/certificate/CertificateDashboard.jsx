import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import Certificate from "./Certificate";
import "./CertificateDashboard.css";

const waitForCertificateAssets = async () => {
  await document.fonts?.ready;

  const images = [...document.querySelectorAll(".certificate-print-page img")];
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );
};

const waitForNextPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

function CertificateDashboard({ certificateData, loading, error }) {
  const navigate = useNavigate();
  const [printingCertificate, setPrintingCertificate] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const certificates = useMemo(
    () => certificateData?.certificates ?? [],
    [certificateData?.certificates]
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredCertificates = useMemo(() => {
    if (!normalizedSearchQuery) {
      return certificates.map((certificate, index) => ({ certificate, originalIndex: index }));
    }

    return certificates
      .map((certificate, index) => ({ certificate, originalIndex: index }))
      .filter(({ certificate }) => {
        const searchableText = [
          certificate.employee?.name,
          certificate.employee?.employee_number,
          certificate.employee?.email,
          certificate.training?.title,
          certificate.result?.score,
          certificate.certificate_number,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchQuery);
    });
  }, [certificates, normalizedSearchQuery]);
  const printingId = printingCertificate?.id ?? null;

  async function downloadCertificate(certificate) {
    setDownloadError("");
    flushSync(() => setPrintingCertificate(certificate));
    document.documentElement.classList.add("is-certificate-printing");
    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-certificate-printing");
        document.body.classList.remove("is-certificate-printing");
        setPrintingCertificate(null);
        window.removeEventListener("afterprint", finishPrint);
      }, 500);
    };

    try {
      await waitForNextPaint();
      await waitForCertificateAssets();
      await waitForNextPaint();
      window.addEventListener("afterprint", finishPrint);
      window.print();
    } catch (error) {
      setDownloadError(
        error.message || "Sertifikat gagal disiapkan. Silakan coba lagi."
      );
      finishPrint();
    }
  }

  if (printingCertificate) {
    return (
      <main className="certificate-print-page" aria-label="Sertifikat siap dicetak">
        <section className="certificate-print-stage">
          <Certificate
            employeeName={printingCertificate.employee?.name}
            trainingTitle={printingCertificate.training?.title}
            certificateNumber={printingCertificate.certificate_number}
            sequenceNumber={printingCertificate.sequence_number}
            romanMonth={printingCertificate.roman_month}
            year={printingCertificate.year}
            completionDate={
              printingCertificate.completion_date ||
              printingCertificate.result?.finished_at ||
              printingCertificate.issued_at
            }
          />
        </section>
      </main>
    );
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
          <div className="certificate-toolbar">
            <label className="certificate-search" htmlFor="certificate-search">
              <span>Cari Sertifikat</span>
              <input
                id="certificate-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nama, username, pelatihan, no sertifikat..."
              />
            </label>
            <p className="certificate-search-count" role="status">
              {filteredCertificates.length} dari {certificates.length} sertifikat
            </p>
          </div>
          <div className="certificate-table-wrap">
            <table className="certificate-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Peserta</th>
                  <th>Username</th>
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
                ) : filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="certificate-empty">
                      Sertifikat tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map(({ certificate, originalIndex }) => (
                    <tr key={certificate.id}>
                      <td data-label="No">{originalIndex + 1}</td>
                      <td data-label="Nama Peserta">{certificate.employee?.name || "-"}</td>
                      <td data-label="Username">{certificate.employee?.employee_number || "-"}</td>
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
    </main>
  );
}

export default CertificateDashboard;
