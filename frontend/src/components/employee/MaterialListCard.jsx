import materialListIcon from "../../assets/icons/icon-daftar-materi.svg";
import completedIcon from "../../assets/icons/icon-listceklis.svg";

function MaterialStatus({ completed }) {
  if (completed) {
    return (
      <img
        className="employee-material-status-icon"
        src={completedIcon}
        alt="Selesai"
      />
    );
  }

  return (
    <span
      className="employee-material-status-pending"
      role="img"
      aria-label="Belum selesai"
    />
  );
}

function MaterialRow({ material, disabled, onOpen }) {
  const file = material.files?.[0];
  const content = (
    <>
      <span className="employee-material-title">{material.title}</span>
      <MaterialStatus completed={!disabled && material.completed} />
    </>
  );

  if (disabled || !file?.file_path) {
    return (
      <div
        className="employee-material-row is-disabled"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      className="employee-material-row"
      href={file.file_path}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => onOpen?.(event, material)}
      aria-label={`Buka ${material.title}`}
    >
      {content}
    </a>
  );
}

function MaterialListCard({ materials, disabled = false, onOpenMaterial }) {
  return (
    <section className="employee-material-card" aria-labelledby="material-list-title">
      <header className="employee-material-card-header">
        <img
          className="employee-material-card-icon"
          src={materialListIcon}
          alt=""
        />
        <h1 id="material-list-title">Daftar Materi</h1>
      </header>

      <div className="employee-material-list">
        {materials.map((material) => (
          <MaterialRow
            key={material.id}
            material={material}
            disabled={disabled}
            onOpen={onOpenMaterial}
          />
        ))}
      </div>
    </section>
  );
}

export default MaterialListCard;
