import { useNavigate } from "react-router-dom";
import { useState } from "react";
import * as statisticsService from "../../services/statisticsService";
import "./StatisticsDashboard.css";

const metricDefinitions = [
  { id: "average", label: "Rata-rata Nilai", field: "average_score" },
  { id: "participants", label: "Jumlah Peserta", field: "participant_count" },
  { id: "passed", label: "Jumlah Lulus", field: "passed_count" },
  { id: "failed", label: "Jumlah Tidak Lulus", field: "failed_count" },
  { id: "highest", label: "Nilai Tertinggi", field: "highest_score" },
  { id: "lowest", label: "Nilai Terendah", field: "lowest_score" },
  { id: "percentage", label: "Persentase Kelulusan", field: "pass_percentage", suffix: "%" },
];

function StatisticsDashboard({ statistics, loading, error, onReset }) {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  async function resetStatistics() {
    setResetting(true);
    setMessage("");

    try {
      await statisticsService.resetStatistics();
      setMessage("Statistik dan progres peserta berhasil direset.");
      setResetDialogOpen(false);
      onReset?.();
    } catch {
      setMessage("Reset statistik gagal. Silakan coba lagi.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="statistics-page">
      <div className="statistics-header">
        <div>
          <h1>{statistics?.title || "Statistik"}</h1>
          {statistics?.training?.title && <p>{statistics.training.title}</p>}
        </div>
        <button
          type="button"
          className="statistics-reset"
          onClick={() => setResetDialogOpen(true)}
          disabled={loading || resetting}
        >
          {resetting ? "Mereset..." : "Reset Statistik"}
        </button>
      </div>

      {loading && <p className="statistics-state">Memuat statistik...</p>}
      {error && <p className="statistics-state statistics-error" role="alert">Data statistik gagal dimuat.</p>}
      {message && <p className="statistics-message" role="status">{message}</p>}

      {!loading && !error && (
        <section className="statistics-grid" aria-label="Ringkasan statistik pelatihan">
          {metricDefinitions.map((metric) => (
            <article className="statistics-card" key={metric.id}>
              <p>{metric.label}</p>
              <strong>{statistics?.[metric.field] ?? "-"}{statistics?.[metric.field] != null ? metric.suffix : ""}</strong>
            </article>
          ))}
        </section>
      )}

      <button type="button" className="statistics-back" onClick={() => navigate(-1)}>← Back</button>
      {resetDialogOpen && (
        <div className="statistics-reset-overlay">
          <div
            className="statistics-reset-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="statistics-reset-title"
          >
            <h3 id="statistics-reset-title" className="statistics-reset-title">
              Reset Statistik
            </h3>
            <p className="statistics-reset-message">
              Apakah Anda yakin ingin mereset statistik peserta?
            </p>
            <p className="statistics-reset-note">
              Hasil ujian dan progres materi yang sudah direset tidak dapat dikembalikan.
            </p>

            <div className="statistics-reset-actions">
              <button
                type="button"
                className="statistics-reset-btn statistics-reset-btn-cancel"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetting}
              >
                Batal
              </button>
              <button
                type="button"
                className="statistics-reset-btn statistics-reset-btn-delete"
                onClick={resetStatistics}
                disabled={resetting}
              >
                {resetting ? "Mereset..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default StatisticsDashboard;
