import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import "./TrainingHistoryDashboard.css";

function TrainingHistoryDashboard({ historyData, loading, error, reload, role }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const histories = useMemo(() => historyData?.histories ?? [], [historyData?.histories]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return histories;
    return histories.filter((history) =>
      [history.employee?.name, history.employee?.employee_number, history.training?.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [histories, query]);

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

  return (
    <main className="history-admin-page">
      <header className="history-admin-header">
        <div>
          <h1>{historyData?.title || "Riwayat Pelatihan"}</h1>
          <p>{historyData?.message || "Riwayat pelatihan karyawan yang telah selesai."}</p>
        </div>
      </header>

      <label className="history-admin-search">
        <span>Cari riwayat</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nama, username, atau pelatihan..."
        />
      </label>

      {loading && <p className="history-admin-state">Memuat riwayat...</p>}
      {error && <p className="history-admin-state history-admin-error">Riwayat gagal dimuat.</p>}
      {actionError && <p className="history-admin-alert" role="alert">{actionError}</p>}

      {!loading && !error && (
        <div className="history-admin-table-wrap">
          <table className="history-admin-table">
            <thead><tr><th>No</th><th>Karyawan</th><th>Pelatihan</th><th>Selesai</th><th>Status</th><th>Sertifikat</th><th>Aksi</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="history-admin-empty">Riwayat tidak ditemukan.</td></tr>
              ) : filtered.map((history, index) => (
                <tr key={`${history.employee.id}-${history.training.id}`}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Karyawan"><strong>{history.employee.name}</strong><small>{history.employee.employee_number}</small></td>
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
            <p>Riwayat <strong>{pendingDelete.training.title}</strong> milik <strong>{pendingDelete.employee.name}</strong> akan dihapus permanen, termasuk hasil ujian, progres materi, dan sertifikat. Karyawan dapat mengikuti pelatihan ini kembali dari awal.</p>
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
