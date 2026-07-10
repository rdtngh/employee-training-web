import "./ConfirmEditDialog.css";

function ConfirmEditDialog({ open, onClose, onConfirm, loading }) {
  if (!open) return null;

  return (
    <div className="confirm-edit-overlay" role="presentation">
      <div
        className="confirm-edit-dialog"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="confirm-edit-title">Konfirmasi Perubahan</h3>

        <p className="confirm-edit-message">
          Apakah Anda yakin ingin menyimpan perubahan pada soal ini?
        </p>

        <div className="confirm-edit-actions">
          <button
            type="button"
            className="confirm-edit-btn confirm-edit-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            className="confirm-edit-btn confirm-edit-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Ya, Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmEditDialog;

