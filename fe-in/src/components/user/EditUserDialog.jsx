import UserForm from "./UserForm";
import "./EditUserDialog.css";

function EditUserDialog({
  isOpen,
  user,
  onSave,
  onCancel,
  loading = false,
  departments,
  roles,
}) {
  if (!isOpen || !user) return null;

  return (
    <div className="edit-user-overlay">
      <div className="edit-user-dialog" role="dialog" aria-modal="true">
        <UserForm
          mode="edit"
          user={user}
          onSubmit={onSave}
          onCancel={onCancel}
          submitLabel="Simpan"
          disabled={loading}
          departments={departments}
          roles={roles}
        />
      </div>
    </div>
  );
}

export default EditUserDialog;
