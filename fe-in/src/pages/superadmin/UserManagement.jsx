import { useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import "./UserManagement.css";
import UserForm from "../../components/user/UserForm";
import UserTable from "../../components/user/UserTable";

import addIcon from "../../assets/icons/icon-tambahpengguna.svg";

function UserManagement() {
  const [users, setUsers] = useState([
    { id: 1, name: "Super Admin", email: "super@rsabl.test", role: "Super Admin" },
    { id: 2, name: "Admin Utama", email: "admin1@rsabl.test", role: "Admin" },
    { id: 3, name: "Karyawan A", email: "karyawan1@rsabl.test", role: "Karyawan" },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setModalOpen(true);
  }

  function handleSave(payload) {
    if (payload.id) {
      setUsers((prev) => prev.map((u) => (u.id === payload.id ? payload : u)));
    } else {
      const nextId = Math.max(...users.map((u) => u.id)) + 1;
      setUsers((prev) => [...prev, { ...payload, id: nextId }]);
    }
    setModalOpen(false);
  }

  function handleDelete(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <DashboardLayout role="superadmin">
      <section className="user-management-card">
        <div className="user-management-header">
          <h1 className="user-management-title">Kelola Pengguna</h1>

          <button className="user-management-add-btn" onClick={openAdd}>
            <img src={addIcon} alt="" className="user-management-add-icon" />
            Tambah Pengguna
          </button>
        </div>

        <UserTable users={users} onEdit={openEdit} onDelete={handleDelete} />

        {modalOpen && (
          <UserForm
            user={editing}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </section>
    </DashboardLayout>
  );
}

export default UserManagement;
