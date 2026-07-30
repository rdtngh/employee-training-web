import "./UserTable.css";

function UserTable({ users, onEdit, onDelete, emptyMessage = "Belum ada pengguna." }) {
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
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" className="user-table-empty">
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
                <td data-label="Aksi">
                  <div className="user-table-actions">
                    <button className="btn-edit" type="button" onClick={() => onEdit(user)}>
                      Edit
                    </button>
                    {user.role === "Super Admin" ? (
                      <span className="muted">Tidak Bisa Dihapus</span>
                    ) : (
                      <button className="btn-delete" type="button" onClick={() => onDelete(user.id)}>
                        Hapus
                      </button>
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
