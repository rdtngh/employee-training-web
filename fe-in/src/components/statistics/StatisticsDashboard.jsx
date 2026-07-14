import { useNavigate } from "react-router-dom";
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

function StatisticsDashboard({ statistics, loading, error }) {
  const navigate = useNavigate();

  return (
    <main className="statistics-page">
      <div className="statistics-header">
        <div>
          <h1>{statistics?.title || "Statistik"}</h1>
          {statistics?.training?.title && <p>{statistics.training.title}</p>}
        </div>
      </div>

      {loading && <p className="statistics-state">Memuat statistik...</p>}
      {error && <p className="statistics-state statistics-error" role="alert">Data statistik gagal dimuat.</p>}

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
    </main>
  );
}

export default StatisticsDashboard;
