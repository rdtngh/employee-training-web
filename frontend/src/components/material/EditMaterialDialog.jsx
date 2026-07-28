import MaterialForm from "./MaterialForm";
import "./EditMaterialDialog.css";

function EditMaterialDialog({
  isOpen,
  material,
  onSubmit,
  onCancel,
  onOpenUpload,
  selectedFileName,
  selectedFile,
  loading,
  trainings,
  lockTraining,
}) {
  if (!isOpen || !material) return null;

  return (
    <div className="edit-material-overlay">
      <div className="edit-material-dialog" role="dialog" aria-modal="true">
        <h2 className="edit-material-title">Edit Materi</h2>
        <MaterialForm
          mode="edit"
          material={material}
          onSubmit={onSubmit}
          onOpenUpload={onOpenUpload}
          selectedFileName={selectedFileName}
          selectedFile={selectedFile}
          loading={loading}
          trainings={trainings}
          selectedTrainingId={material.training_id ?? material.training?.id}
          lockTraining={lockTraining}
        />
        <button
          type="button"
          className="edit-material-cancel"
          onClick={onCancel}
          disabled={loading}
        >
          Batal
        </button>
      </div>
    </div>
  );
}

export default EditMaterialDialog;
