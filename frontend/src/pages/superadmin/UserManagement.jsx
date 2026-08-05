import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import UserForm from "../../components/user/UserForm";
import UserTable from "../../components/user/UserTable";
import EditUserDialog from "../../components/user/EditUserDialog";
import UserStatusDialog from "../../components/user/UserStatusDialog";
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
    updateUserStatus,
    importUsers,
  } = useUsers();
  const [editingUser, setEditingUser] = useState(null);
  const [statusUser, setStatusUser] = useState(null);
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

  async function confirmStatusChange() {
    if (!statusUser) return;
    const nextStatus = !statusUser.isActive;
    const result = await updateUserStatus(statusUser.id, nextStatus);
    if (result === true) {
      setStatusUser(null);
      setToast(nextStatus ? "Pengguna berhasil diaktifkan kembali." : "Pengguna berhasil dinonaktifkan.");
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
      deactivated: result.deactivated ?? 0,
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
            onToggleStatus={setStatusUser}
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

      <UserStatusDialog
        user={statusUser}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusUser(null)}
        loading={loading}
      />

      {toast && <div className="user-management-toast">{toast}</div>}
      {importNotice && (
        <div className="user-import-success-toast" role="status" aria-live="polite">
          <div>
            <strong>Import data karyawan berhasil.</strong>
            <span>
              {importNotice.created} baru, {importNotice.updated} update,{" "}
              {importNotice.deactivated} dinonaktifkan, {importNotice.skipped} dilewati.
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
