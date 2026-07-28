import materialListIcon from "../../assets/icons/icon-daftar-materi.svg";

function TrainingSelectionCard({
  title,
  trainings,
  loading,
  error,
  actionLabel,
  onSelectTraining,
  emptyMessage = "Belum ada pelatihan.",
}) {
  return (
    <section className="employee-material-card" aria-labelledby="training-selection-title">
      <header className="employee-material-card-header">
        <img className="employee-material-card-icon" src={materialListIcon} alt="" />
        <h1 id="training-selection-title">{title}</h1>
      </header>

      {loading && <p className="employee-training-state">Memuat pelatihan...</p>}
      {error && (
        <p className="employee-training-state employee-training-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="employee-material-list">
          {trainings.length === 0 ? (
            <p className="employee-training-state">{emptyMessage}</p>
          ) : (
            trainings.map((training) => (
              <button
                type="button"
                className="employee-material-row employee-training-row"
                key={training.id}
                onClick={() => onSelectTraining(training)}
              >
                <span className="employee-material-title">{training.title}</span>
                <span className="employee-training-action">{actionLabel}</span>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default TrainingSelectionCard;
