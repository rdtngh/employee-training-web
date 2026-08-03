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
  const [printingCertificates, setPrintingCertificates] = useState([]);
  const [downloadError, setDownloadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState("all");
  const certificates = useMemo(
    () => certificateData?.certificates ?? [],
    [certificateData?.certificates]
  );
  const trainingOptions = useMemo(() => {
    const trainings = new Map();

    certificates.forEach((certificate) => {
      const id = certificate.training?.id;
      const title = certificate.training?.title;

      if (id !== null && id !== undefined && title) {
        trainings.set(String(id), title);
      }
    });

    return [...trainings.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "id-ID"));
  }, [certificates]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredCertificates = useMemo(() => {
    return certificates
      .map((certificate, index) => ({ certificate, originalIndex: index }))
      .filter(({ certificate }) => {
        if (
          selectedTrainingId !== "all" &&
          String(certificate.training?.id ?? "") !== selectedTrainingId
        ) {
          return false;
        }

        if (!normalizedSearchQuery) {
          return true;
        }

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
  }, [certificates, normalizedSearchQuery, selectedTrainingId]);
  const printingCertificate = printingCertificates[0] ?? null;
  const printingId = printingCertificates.length === 1 ? printingCertificate?.id ?? null : null;
  const isBulkPrinting = printingCertificates.length > 1;

  async function printCertificates(certificatesToPrint) {
    if (certificatesToPrint.length === 0) {
      setDownloadError("Tidak ada sertifikat untuk didownload.");
      return;
    }

    setDownloadError("");
    flushSync(() => setPrintingCertificates(certificatesToPrint));
    document.documentElement.classList.add("is-certificate-printing");
    document.body.classList.add("is-certificate-printing");

    const finishPrint = () => {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-certificate-printing");
        document.body.classList.remove("is-certificate-printing");
        setPrintingCertificates([]);
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

  function downloadCertificate(certificate) {
    printCertificates([certificate]);
  }

  function downloadVisibleCertificates() {
    printCertificates(filteredCertificates.map(({ certificate }) => certificate));
  }

  if (printingCertificates.length > 0) {
    return (
      <main className="certificate-print-page" aria-label="Sertifikat siap dicetak">
        {printingCertificates.map((certificate) => (
          <section className="certificate-print-stage" key={certificate.id}>
            <Certificate
              employeeName={certificate.employee?.name}
              trainingTitle={certificate.training?.title}
              certificateNumber={certificate.certificate_number}
              sequenceNumber={certificate.sequence_number}
              romanMonth={certificate.roman_month}
              year={certificate.year}
              completionDate={
                certificate.completion_date ||
                certificate.result?.finished_at ||
                certificate.issued_at
              }
            />
          </section>
        ))}
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
            <div className="certificate-filters">
              <label className="certificate-filter-field" htmlFor="certificate-training-filter">
                <span>Filter Pelatihan</span>
                <select
                  id="certificate-training-filter"
                  value={selectedTrainingId}
                  onChange={(event) => setSelectedTrainingId(event.target.value)}
                >
                  <option value="all">Semua pelatihan</option>
                  {trainingOptions.map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>
              </label>
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
            </div>
            <div className="certificate-toolbar-summary">
              <p className="certificate-search-count" role="status">
                {filteredCertificates.length} dari {certificates.length} sertifikat
              </p>
              <button
                type="button"
                className="certificate-download-all"
                onClick={downloadVisibleCertificates}
                disabled={filteredCertificates.length === 0 || isBulkPrinting}
              >
                {isBulkPrinting ? "Menyiapkan..." : "Download Semua PDF"}
              </button>
            </div>
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
