import "./MaterialTable.css";

function MaterialTable({ materials, onOpen, onEdit, onDelete, emptyMessage = "Belum ada materi." }) {
  return (
    <div className="material-table-wrap">
      <table className="material-table">
        <thead>
          <tr>
            <th>Judul Materi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {materials.length === 0 ? (
            <tr>
              <td colSpan="2" className="material-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            materials.map((material) => (
              <tr key={material.id}>
                <td data-label="Judul Materi">{material.title}</td>
                <td data-label="Aksi">
                  <div className="material-table-actions">
                    <button
                      type="button"
                      className="material-action material-action-open"
                      onClick={() => onOpen(material)}
                    >
                      Buka
                    </button>
                    <button
                      type="button"
                      className="material-action material-action-edit"
                      onClick={() => onEdit(material)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="material-action material-action-delete"
                      onClick={() => onDelete(material.id)}
                    >
                      Hapus
                    </button>
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

export default MaterialTable;
