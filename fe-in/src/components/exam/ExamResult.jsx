import { useState } from "react";
import { useNavigate } from "react-router-dom";
import statisticsIcon from "../../assets/icons/icon-statistik.svg";
import certificateIcon from "../../assets/icons/icon-sertifikat.svg";
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
  const navigate = useNavigate();
  const rolePath = role === "superadmin" ? "superadmin" : "admin";

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
            onClick={() => alert("Fitur Export SPSS akan segera tersedia.")}
          >
            Export SPSS
          </button>
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
