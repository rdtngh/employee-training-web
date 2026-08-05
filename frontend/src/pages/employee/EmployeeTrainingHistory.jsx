import { Link } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useServiceData } from "../../hooks/useServiceData";
import * as trainingHistoryService from "../../services/trainingHistoryService";
import "./EmployeeTrainingHistory.css";

function EmployeeTrainingHistory() {
  const { data, loading, error } = useServiceData(
    trainingHistoryService.getEmployeeHistory,
    "employee-history",
    { title: "Riwayat Pelatihan", message: "", histories: [] }
  );

  return (
    <DashboardLayout role="employee">
      <main className="employee-history-page">
        <header><h1>{data?.title || "Riwayat Pelatihan"}</h1><p>{data?.message}</p></header>
        {loading && <p className="employee-history-state">Memuat riwayat...</p>}
        {error && <p className="employee-history-state employee-history-error">Riwayat pelatihan gagal dimuat.</p>}
        {!loading && !error && (
          <section className="employee-history-list">
            {(data?.histories ?? []).length === 0 ? (
              <p className="employee-history-state">Belum ada pelatihan yang selesai.</p>
            ) : data.histories.map((history) => (
              <article className="employee-history-card" key={history.training.id}>
                <div className="employee-history-copy">
                  <h2>{history.training.title}</h2>
                  <dl>
                    <div><dt>Tanggal selesai</dt><dd>{new Date(history.result.finished_at).toLocaleDateString("id-ID")}</dd></div>
                    <div><dt>Nilai</dt><dd>{history.result.score}</dd></div>
                    <div><dt>Status</dt><dd>{history.result.status}</dd></div>
                    <div><dt>Sertifikat</dt><dd>{history.certificate ? "Tersedia" : "Tidak tersedia"}</dd></div>
                  </dl>
                </div>
                {history.certificate && (
                  <Link className="employee-history-certificate" to={`/employee/certificate/${history.training.id}`}>
                    Lihat Sertifikat
                  </Link>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </DashboardLayout>
  );
}

export default EmployeeTrainingHistory;
