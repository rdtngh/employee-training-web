import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import statisticsIcon from "../../assets/icons/icon-statistik.svg";
import certificateIcon from "../../assets/icons/icon-sertifikat.svg";
import * as statisticsService from "../../services/statisticsService";
import * as trainingService from "../../services/trainingService";
import { downloadFile } from "../../utils/downloadFile";
import "./ExamResult.css";

const resultSections = [
  {
    id: "statistics",
    title: "Statistik",
    icon: statisticsIcon,
  },
  {
    id: "certificate",
    title: "Sertifikat",
    icon: certificateIcon,
  },
];

function ExamResult({ role }) {
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [statisticsSummary, setStatisticsSummary] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [trainings, setTrainings] = useState([]);
  const [trainingsLoading, setTrainingsLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportTrainingId, setExportTrainingId] = useState("");
  const navigate = useNavigate();
  const rolePath = role === "superadmin" ? "superadmin" : "admin";
  const hasStatisticsData = Number(statisticsSummary?.participant_count ?? 0) > 0;
  const exportDisabled = exporting || statisticsLoading || trainingsLoading || trainings.length === 0;

  useEffect(() => {
    let active = true;

    statisticsService
      .getStatistics(role)
      .then((statistics) => {
        if (active) setStatisticsSummary(statistics);
      })
      .catch(() => {
        if (active) setStatisticsSummary(null);
      })
      .finally(() => {
        if (active) setStatisticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    let active = true;

    trainingService
      .getTrainings()
      .then((data) => {
        if (!active) return;
        setTrainings(data);
        setExportTrainingId((current) => current || String(data[0]?.id ?? ""));
      })
      .catch(() => {
        if (active) setTrainings([]);
      })
      .finally(() => {
        if (active) setTrainingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function openExportDialog() {
    if (trainings.length === 0) {
      setExportError("Belum ada pelatihan yang tersedia untuk diexport.");
      return;
    }

    setExportError("");
    setExportDialogOpen(true);
  }

  async function exportXlsx() {
    if (!exportTrainingId) {
      setExportError("Pilih pelatihan yang ingin diexport.");
      return;
    }

    setExporting(true);
    setExportError("");

    try {
      const file = await statisticsService.exportStatistics({
        format: "xlsx",
        trainingId: exportTrainingId,
      });
      downloadFile(file);
      setExportDialogOpen(false);
    } catch (error) {
      setExportError(
        error.response?.data?.message || "Export statistik gagal. Silakan coba lagi."
      );
    } finally {
      setExporting(false);
    }
  }

  function toggleSection(sectionId) {
    if (sectionId === "statistics") {
      setStatisticsOpen((isOpen) => !isOpen);
      return;
    }

    setCertificateOpen((isOpen) => !isOpen);
  }

  function renderSectionContent(sectionId) {
    if (sectionId === "statistics") {
      return (
        <div className="exam-result-menu-list">
          <button
            type="button"
            className="exam-result-menu-button"
            onClick={() => navigate(`/${rolePath}/statistics`)}
          >
            Lihat Statistik
          </button>
          <button
            type="button"
            className="exam-result-menu-button"
            onClick={openExportDialog}
            disabled={exportDisabled}
          >
            {exporting ? "Mengunduh..." : "Export XLSX"}
          </button>
          {!statisticsLoading && !hasStatisticsData && (
            <p className="exam-result-note" role="status">
              Pilih pelatihan saat export untuk mengunduh data yang tersedia.
            </p>
          )}
          {exportError && (
            <p className="exam-result-error" role="alert">
              {exportError}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="exam-result-certificate-content">
        <p>
          Daftar sertifikat peserta yang telah lulus pelatihan akan ditampilkan di sini.
        </p>
        <button
          type="button"
          className="exam-result-primary-button"
          onClick={() => navigate(`/${rolePath}/certificates`)}
        >
          Lihat Sertifikat
        </button>
      </div>
    );
  }

  return (
    <main className="exam-result-page">
      <h1 className="exam-result-title">Hasil Ujian</h1>
      <div className="exam-result-accordion">
        {resultSections.map((section) => {
          const isOpen =
            section.id === "statistics" ? statisticsOpen : certificateOpen;

          return (
            <section className="exam-result-card" key={section.id}>
              <button
                type="button"
                className="exam-result-card-header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                aria-controls={`exam-result-${section.id}`}
              >
                <img src={section.icon} alt="" className="exam-result-card-icon" />
                <span className="exam-result-card-title">{section.title}</span>
                <span className={`exam-result-arrow${isOpen ? " open" : ""}`} aria-hidden="true" />
              </button>
              <div
                id={`exam-result-${section.id}`}
                className={`exam-result-card-content${isOpen ? " open" : ""}`}
              >
                <div className="exam-result-card-content-inner">
                  {renderSectionContent(section.id)}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {exportDialogOpen && (
        <div className="exam-export-overlay">
          <div
            className="exam-export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-export-title"
          >
            <h3 id="exam-export-title" className="exam-export-title">
              Export Statistik
            </h3>
            <label htmlFor="exam-export-training">Pelatihan</label>
            <select
              id="exam-export-training"
              value={exportTrainingId}
              onChange={(event) => setExportTrainingId(event.target.value)}
              disabled={exporting}
            >
              {trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
            {exportError && (
              <p className="exam-result-error" role="alert">
                {exportError}
              </p>
            )}
            <div className="exam-export-actions">
              <button
                type="button"
                className="exam-export-btn exam-export-btn-cancel"
                onClick={() => setExportDialogOpen(false)}
                disabled={exporting}
              >
                Batal
              </button>
              <button
                type="button"
                className="exam-export-btn exam-export-btn-confirm"
                onClick={exportXlsx}
                disabled={exporting || !exportTrainingId}
              >
                {exporting ? "Mengunduh..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function ExamResultPlaceholder({ title, message }) {
  const navigate = useNavigate();

  return (
    <main className="exam-result-page">
      <h1 className="exam-result-title">{title}</h1>
      <section className="exam-result-placeholder-card">
        <p>{message}</p>
      </section>
      <button type="button" className="exam-result-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
    </main>
  );
}

export default ExamResult;
