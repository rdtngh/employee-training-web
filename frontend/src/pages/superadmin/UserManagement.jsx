import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import UserForm from "../../components/user/UserForm";
import UserTable from "../../components/user/UserTable";
import EditUserDialog from "../../components/user/EditUserDialog";
import DeleteUserDialog from "../../components/user/DeleteUserDialog";
import { useUsers } from "../../hooks/useUsers";
import "./UserManagement.css";

function UserManagement() {
  const {
    users,
    userFormOptions,
    loading,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    importUsers,
  } = useUsers();
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [toast, setToast] = useState("");
  const [importNotice, setImportNotice] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers(searchKeyword.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadUsers, searchKeyword]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!importNotice) return undefined;

    const timer = window.setTimeout(() => setImportNotice(null), 5200);
    return () => window.clearTimeout(timer);
  }, [importNotice]);

  async function handleAdd(payload) {
    const result = await addUser(payload);
    if (result !== true) {
      setToast(result);
      return false;
    }
    setToast("Pengguna berhasil ditambahkan.");
    return true;
  }

  async function handleEdit(payload) {
    const result = await updateUser(payload.id, payload);
    if (result === true) {
      setEditingUser(null);
      setToast("Pengguna berhasil diperbarui.");
      return true;
    }

    setToast(result);
    return false;
  }

  function openDeleteDialog(id) {
    const selectedUser = users.find((user) => user.id === id);
    if (selectedUser?.role === "Super Admin") return;

    setDeletingUserId(id);
  }

  async function confirmDelete() {
    const result = await deleteUser(deletingUserId);
    if (result === true) {
      setDeletingUserId(null);
      setToast("Pengguna berhasil dihapus.");
      return;
    }

    setToast(result);
  }

  async function handleImport(event) {
    event.preventDefault();

    if (!importFile) {
      setToast("Pilih file Excel terlebih dahulu.");
      return;
    }

    const result = await importUsers(importFile);

    if (typeof result === "string") {
      setToast(result);
      return;
    }

    setImportFile(null);
    event.currentTarget.reset();
    setImportNotice({
      created: result.created ?? 0,
      updated: result.updated ?? 0,
      deleted: result.deleted ?? 0,
      skipped: result.skipped ?? 0,
    });
  }

  return (
    <DashboardLayout role="superadmin">
      <div className="user-management-page">
        <section className="user-management-card">
          <div className="user-management-header user-management-data-header">
            <h1 className="user-management-title">Data Pengguna</h1>
            <input
              type="search"
              className="user-search-input"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari pengguna..."
              aria-label="Cari pengguna"
            />
          </div>

          <UserTable
            users={users}
            onEdit={setEditingUser}
            onDelete={openDeleteDialog}
            emptyMessage={searchKeyword.trim() ? "Pengguna tidak ditemukan." : "Belum ada pengguna."}
          />
        </section>

        <section className="user-management-card user-management-import-card">
          <div className="user-management-header">
            <h2 className="user-management-title">Import Data Karyawan</h2>
          </div>

          <form className="user-import-form" onSubmit={handleImport}>
            <label className="user-import-field">
              <span>File Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                disabled={loading}
              />
            </label>
            <p className="user-import-note">
              Kolom username atau No Rekening digunakan sebagai username login. Sertakan kolom Departemen agar data karyawan masuk sesuai file.
            </p>
            <button type="submit" className="user-import-button" disabled={loading}>
              {loading ? "Memproses..." : "Import Karyawan"}
            </button>
          </form>
        </section>

        <section className="user-management-card user-management-add-card">
          <UserForm
            mode="add"
            onSubmit={handleAdd}
            disabled={loading}
            departments={userFormOptions.departments}
            roles={userFormOptions.roles}
          />
        </section>
      </div>

      <EditUserDialog
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onSave={handleEdit}
        onCancel={() => setEditingUser(null)}
        loading={loading}
        departments={userFormOptions.departments}
        roles={userFormOptions.roles}
      />

      <DeleteUserDialog
        isOpen={Boolean(deletingUserId)}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingUserId(null)}
      />

      {toast && <div className="user-management-toast">{toast}</div>}
      {importNotice && (
        <div className="user-import-success-toast" role="status" aria-live="polite">
          <div>
            <strong>Import data karyawan berhasil.</strong>
            <span>
              {importNotice.created} baru, {importNotice.updated} update,{" "}
              {importNotice.deleted} dihapus, {importNotice.skipped} dilewati.
            </span>
          </div>
          <button
            type="button"
            className="user-import-success-close"
            onClick={() => setImportNotice(null)}
            aria-label="Tutup notifikasi import"
          >
            ×
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

export default UserManagement;
