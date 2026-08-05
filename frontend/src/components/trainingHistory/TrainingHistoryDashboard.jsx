import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import Certificate from "../certificate/Certificate";
import "../certificate/CertificateDashboard.css";
import "./TrainingHistoryDashboard.css";

const waitForNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const waitForCertificateAssets = () => Promise.all(
  [...document.querySelectorAll(".certificate-print-page img")].map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  })
);

function TrainingHistoryDashboard({ historyData, certificateData, certificatesLoading, loading, error, reload, role }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState("all");
  const [printingCertificates, setPrintingCertificates] = useState([]);
  const histories = useMemo(() => historyData?.histories ?? [], [historyData?.histories]);
  const certificates = useMemo(() => certificateData?.certificates ?? [], [certificateData?.certificates]);
  const trainingOptions = useMemo(() => {
    const options = new Map();
    histories.forEach((history) => options.set(String(history.training.id), history.training.title));
    return [...options.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "id-ID"));
  }, [histories]);
  const filteredCertificates = useMemo(() => certificates.filter((certificate) =>
    selectedTrainingId === "all" || String(certificate.training?.id) === selectedTrainingId
  ), [certificates, selectedTrainingId]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return histories.filter((history) => {
      if (selectedTrainingId !== "all" && String(history.training.id) !== selectedTrainingId) {
        return false;
      }
      if (!keyword) return true;
      return [history.employee?.name, history.employee?.employee_number, history.training?.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    });
  }, [histories, query, selectedTrainingId]);

  async function printFilteredCertificates() {
    if (filteredCertificates.length === 0) {
      setActionError("Tidak ada sertifikat pada pelatihan yang dipilih.");
      return;
    }
    setActionError("");
    flushSync(() => setPrintingCertificates(filteredCertificates));
    document.documentElement.classList.add("is-certificate-printing");
    document.body.classList.add("is-certificate-printing");
    const finishPrint = () => window.setTimeout(() => {
      document.documentElement.classList.remove("is-certificate-printing");
      document.body.classList.remove("is-certificate-printing");
      setPrintingCertificates([]);
      window.removeEventListener("afterprint", finishPrint);
    }, 500);
    try {
      await document.fonts?.ready;
      await waitForNextPaint();
      await waitForCertificateAssets();
      await waitForNextPaint();
      window.addEventListener("afterprint", finishPrint);
      window.print();
    } catch (printError) {
      setActionError(printError.message || "Sertifikat gagal disiapkan.");
      finishPrint();
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError("");
    try {
      await trainingHistoryService.deleteHistory(
        pendingDelete.training.id,
        pendingDelete.employee.id
      );
      setPendingDelete(null);
      reload();
    } catch (deleteError) {
      setActionError(
        deleteError.response?.data?.message || "Riwayat pelatihan gagal dihapus."
      );
    } finally {
      setDeleting(false);
    }
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
              completionDate={certificate.completion_date || certificate.result?.finished_at || certificate.issued_at}
              certificateTemplate={certificate.training?.certificate_template}
            />
          </section>
        ))}
      </main>
    );
  }

  return (
    <main className="history-admin-page">
      <header className="history-admin-header">
        <div>
          <h1>{historyData?.title || "Riwayat Pelatihan"}</h1>
          <p>{historyData?.message || "Riwayat pelatihan karyawan yang telah selesai."}</p>
        </div>
      </header>

      <div className="history-toolbar">
        <label className="history-filter">
          <span>Filter Pelatihan</span>
          <select value={selectedTrainingId} onChange={(event) => setSelectedTrainingId(event.target.value)}>
            <option value="all">Semua pelatihan</option>
            {trainingOptions.map((training) => <option key={training.id} value={training.id}>{training.title}</option>)}
          </select>
        </label>
        <label className="history-admin-search">
          <span>Cari riwayat</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama atau username..." />
        </label>
        <button type="button" className="history-download-all" onClick={printFilteredCertificates} disabled={certificatesLoading || filteredCertificates.length === 0}>
          {certificatesLoading ? "Memuat..." : `Download Semua PDF (${filteredCertificates.length})`}
        </button>
      </div>

      {loading && <p className="history-admin-state">Memuat riwayat...</p>}
      {error && <p className="history-admin-state history-admin-error">Riwayat gagal dimuat.</p>}
      {actionError && <p className="history-admin-alert" role="alert">{actionError}</p>}

      {!loading && !error && (
        <div className="history-admin-table-wrap">
          <table className="history-admin-table">
            <thead><tr><th>No</th><th>Peserta</th><th>Pelatihan</th><th>Selesai</th><th>Status</th><th>Sertifikat</th><th>Aksi</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="history-admin-empty">Riwayat tidak ditemukan.</td></tr>
              ) : filtered.map((history, index) => (
                <tr key={`${history.employee.id}-${history.training.id}`}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Peserta"><strong>{history.employee.name}</strong><small>{history.employee.employee_number}</small></td>
                  <td data-label="Pelatihan">{history.training.title}</td>
                  <td data-label="Selesai">{new Date(history.result.finished_at).toLocaleDateString("id-ID")}</td>
                  <td data-label="Status">{history.result.status} ({history.result.score})</td>
                  <td data-label="Sertifikat">{history.certificate ? "Tersedia" : "Tidak tersedia"}</td>
                  <td data-label="Aksi">
                    <div className="history-actions">
                      {history.certificate && (
                        <button
                          type="button"
                          className="history-view"
                          onClick={() => navigate(`/${role}/certificates/${history.certificate.id}`)}
                        >
                          Lihat Sertifikat
                        </button>
                      )}
                      <button type="button" className="history-delete" onClick={() => setPendingDelete(history)}>Hapus Riwayat</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="history-back" onClick={() => navigate(-1)}>Back</button>

      {pendingDelete && (
        <div className="history-dialog-backdrop" role="presentation" onMouseDown={() => !deleting && setPendingDelete(null)}>
          <section className="history-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-history-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="delete-history-title">Hapus riwayat pelatihan?</h2>
            <p>Riwayat <strong>{pendingDelete.training.title}</strong> milik <strong>{pendingDelete.employee.name}</strong> akan dihapus permanen, termasuk hasil ujian, progres materi, dan sertifikat. Peserta dapat mengikuti pelatihan ini kembali dari awal.</p>
            <div className="history-dialog-actions">
              <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting}>Batal</button>
              <button type="button" className="history-delete-confirm" onClick={confirmDelete} disabled={deleting}>{deleting ? "Menghapus..." : "Hapus Permanen"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default TrainingHistoryDashboard;
