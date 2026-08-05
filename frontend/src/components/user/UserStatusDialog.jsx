import "./UserStatusDialog.css";

function UserStatusDialog({ user, onConfirm, onCancel, loading = false }) {
  if (!user) return null;
  const willActivate = !user.isActive;

  return (
    <div className="user-status-overlay">
      <div className="user-status-dialog" role="dialog" aria-modal="true" aria-labelledby="user-status-title">
        <h3 id="user-status-title" className="user-status-title">
          {willActivate ? "Aktifkan Pengguna" : "Nonaktifkan Pengguna"}
        </h3>
        <p className="user-status-message">
          {willActivate
            ? `Aktifkan kembali akun ${user.user}?`
            : `Nonaktifkan akun ${user.user}? Pengguna tidak akan dapat login, tetapi seluruh datanya tetap tersimpan.`}
        </p>
        <div className="user-status-actions">
          <button type="button" className="user-status-btn user-status-cancel" onClick={onCancel} disabled={loading}>Batal</button>
          <button type="button" className={`user-status-btn ${willActivate ? "user-status-activate" : "user-status-deactivate"}`} onClick={onConfirm} disabled={loading}>
            {loading ? "Memproses..." : willActivate ? "Aktifkan" : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserStatusDialog;
