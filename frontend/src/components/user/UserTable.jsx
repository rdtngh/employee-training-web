import "./UserTable.css";

function UserTable({ users, onEdit, onToggleStatus, emptyMessage = "Belum ada pengguna." }) {
  return (
    <div className="user-table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Username</th>
            <th>Nama</th>
            <th>Departemen</th>
            <th>Role</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="7" className="user-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            users.map((user, idx) => (
              <tr key={user.id} className={user.role === "Super Admin" ? "row-super" : ""}>
                <td data-label="No">{idx + 1}</td>
                <td data-label="Username">{user.userId}</td>
                <td data-label="Nama">{user.user}</td>
                <td data-label="Departemen">{user.department}</td>
                <td data-label="Role">{user.role}</td>
                <td data-label="Status"><span className={`user-status-badge ${user.isActive ? "is-active" : "is-inactive"}`}>{user.isActive ? "Aktif" : "Nonaktif"}</span></td>
                <td data-label="Aksi">
                  <div className="user-table-actions">
                    {user.isProtectedSuperadmin ? (
                      <span className="muted">Super Admin Utama</span>
                    ) : (
                      <>
                        <button className="btn-edit" type="button" onClick={() => onEdit(user)}>
                          Edit
                        </button>
                        <button className={user.isActive ? "btn-deactivate" : "btn-activate"} type="button" onClick={() => onToggleStatus(user)}>
                          {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
