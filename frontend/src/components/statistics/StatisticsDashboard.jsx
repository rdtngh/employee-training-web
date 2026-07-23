import { useNavigate } from "react-router-dom";
import { useState } from "react";
import * as statisticsService from "../../services/statisticsService";
import statisticIcon from "../../assets/icons/icon-statistik.svg";
import "./StatisticsDashboard.css";

const yAxisTicks = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const defaultRanges = ["1-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100"];

function getDistribution(statistics, type) {
  const distribution = statistics?.score_distributions?.[type];

  return {
    label: distribution?.label || (type === "pretest" ? "Pre Test" : "Post Test"),
    participantCount: distribution?.participant_count ?? 0,
    ranges: distribution?.ranges?.length
      ? distribution.ranges
      : defaultRanges.map((label) => ({ label, count: 0, percentage: 0 })),
  };
}

function ScoreChart({ distribution }) {
  return (
    <article className="statistics-chart-card">
      <div className="statistics-chart-title">
        <h2>{distribution.label}</h2>
        <span>{distribution.participantCount} peserta</span>
      </div>

      <div className="statistics-chart" role="img" aria-label={`Grafik distribusi nilai ${distribution.label}`}>
        <div className="statistics-y-axis" aria-hidden="true">
          {yAxisTicks.map((tick) => (
            <span key={tick}>{tick}%</span>
          ))}
        </div>
        <div className="statistics-plot">
          <div className="statistics-gridlines" aria-hidden="true">
            {yAxisTicks.map((tick) => (
              <span key={tick} />
            ))}
          </div>
          <div className="statistics-bars">
            {distribution.ranges.map((range) => {
              const percentage = Math.max(0, Math.min(Number(range.percentage) || 0, 100));

              return (
                <div className="statistics-bar-column" key={range.label}>
                  <div className="statistics-bar-track">
                    <div
                      className="statistics-bar"
                      style={{ height: `${percentage}%` }}
                      title={`${range.label}: ${range.count} peserta (${percentage}%)`}
                    />
                  </div>
                  <span className="statistics-x-label">{range.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatisticsDashboard({ statistics, loading, error, onReset }) {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const preTestDistribution = getDistribution(statistics, "pretest");
  const postTestDistribution = getDistribution(statistics, "posttest");

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
        <div className="statistics-title-wrap">
          <img src={statisticIcon} alt="" className="statistics-title-icon" />
          <div>
            <h1>{statistics?.title || "Statistik"}</h1>
            {statistics?.training?.title && <p>{statistics.training.title}</p>}
          </div>
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
        <section className="statistics-chart-grid" aria-label="Grafik statistik pelatihan">
          <ScoreChart distribution={preTestDistribution} />
          <ScoreChart distribution={postTestDistribution} />
        </section>
      )}

      <button type="button" className="statistics-back" onClick={() => navigate(-1)}>&larr; Back</button>
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
