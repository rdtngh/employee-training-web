import React from "react";
import "./UserTable.css";

function UserTable({ users, onEdit, onDelete }) {
  return (
    <div className="user-table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={user.id} className={user.role === "Super Admin" ? "row-super" : ""}>
              <td>{idx + 1}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                {user.role === "Super Admin" ? (
                  <span className="muted">Tidak Bisa Dihapus</span>
                ) : (
                  <>
                    <button className="btn-edit" type="button" onClick={() => onEdit(user)}>
                      Edit
                    </button>
                    <button className="btn-delete" type="button" onClick={() => onDelete(user.id)}>
                      Hapus
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
