import { useState, useEffect } from "react";
import "./UserForm.css";

function UserForm({ user, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Karyawan" });

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, role: user.role, id: user.id });
    else setForm({ name: "", email: "", role: "Karyawan" });
  }, [user]);

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    onSave(form);
  }

  return (
    <div className="user-form-modal">
      <div className="user-form-dialog">
        <h3 className="user-form-title">{user ? "Edit Pengguna" : "Tambah Pengguna"}</h3>

        <form onSubmit={submit} className="user-form-form">
          <label>
            Nama
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label>
            Email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>

          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option>
              <option>Karyawan</option>
            </select>
          </label>

          <div className="user-form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-save">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserForm;
