import "./DeleteMaterialUploadDialog.css";

function DeleteMaterialUploadDialog({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="delete-material-upload-overlay">
      <div
        className="delete-material-upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-material-upload-title"
        aria-describedby="delete-material-upload-message"
      >
        <h3
          id="delete-material-upload-title"
          className="delete-material-upload-title"
        >
          Hapus Materi
        </h3>
        <p
          id="delete-material-upload-message"
          className="delete-material-upload-message"
        >
          Apakah Anda yakin ingin menghapus file materi ini dari daftar upload?
        </p>

        <div className="delete-material-upload-actions">
          <button
            type="button"
            className="delete-material-upload-btn delete-material-upload-btn-cancel"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="delete-material-upload-btn delete-material-upload-btn-delete"
            onClick={onConfirm}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteMaterialUploadDialog;
