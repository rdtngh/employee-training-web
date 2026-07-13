import { useState } from "react";
import uploadIcon from "../../assets/icons/icon-upload.svg";
import DeleteMaterialUploadDialog from "./DeleteMaterialUploadDialog";
import "./MaterialForm.css";

const createEditForm = (material) => ({
  id: material?.id,
  title: material?.title ?? "",
  fileName: material?.fileName ?? "",
  fileType: material?.fileType ?? "",
  file: material?.file ?? null,
});

function MaterialFormContent({
  mode = "add",
  material,
  onSubmit,
  onOpenUpload,
  selectedFileName,
  selectedFile,
  selectedFiles = [],
  onSelectedFilesChange,
  loading = false,
}) {
  const [editForm, setEditForm] = useState(() => createEditForm(material));
  const [errors, setErrors] = useState({});
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const isAddMode = mode === "add";
  const items = isAddMode ? selectedFiles : [];
  const fileName = isAddMode
    ? selectedFileName ?? ""
    : selectedFileName ?? editForm.fileName;

  function validate() {
    const nextErrors = {};

    if (!fileName) nextErrors.fileName = "Upload File Materi wajib diisi";

    if (isAddMode) {
      const itemTitles = {};
      items.forEach((item) => {
        if (!item.title?.trim()) itemTitles[item.id] = "Judul Materi wajib diisi";
      });
      if (Object.keys(itemTitles).length > 0) nextErrors.itemTitles = itemTitles;
    } else if (!editForm.title.trim()) {
      nextErrors.title = "Judul Materi wajib diisi";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function confirmRemoveSelectedFile() {
    if (!selectedMaterial) return;

    setErrors({});
    onSelectedFilesChange?.(
      items.filter((item) => item.id !== selectedMaterial.id)
    );
    setSelectedMaterial(null);
  }

  function clearSelectedFiles() {
    setErrors({});
    onSelectedFilesChange?.([]);
  }

  function updateItemTitle(id, title) {
    onSelectedFilesChange?.(
      items.map((item) => (item.id === id ? { ...item, title } : item))
    );
    setErrors((prev) => {
      if (!prev.itemTitles?.[id]) return prev;

      const itemTitles = { ...prev.itemTitles };
      delete itemTitles[id];
      return { ...prev, itemTitles };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    if (isAddMode && items.length > 1) {
      onSubmit({ items });
      return;
    }

    if (isAddMode) {
      const [item] = items;
      onSubmit({ ...item, items: [] });
      return;
    }

    onSubmit({
      ...editForm,
      file: selectedFile?.file ?? editForm.file,
      fileName,
      fileType: selectedFile?.fileType ?? editForm.fileType,
      items: [],
    });
  }

  return (
    <form className="material-form" onSubmit={handleSubmit}>
      <div className="material-form-group">
        <label htmlFor={`${mode}-material-file`} className="material-form-label">
          Upload File Materi
        </label>
        <div className="material-upload-row">
          <input
            id={`${mode}-material-file`}
            value={fileName}
            readOnly
            className={`material-form-input ${errors.fileName ? "error" : ""}`}
            placeholder=""
          />
          {items.length > 1 && isAddMode && (
            <button
              type="button"
              className="material-clear-file-btn"
              onClick={clearSelectedFiles}
              disabled={loading}
            >
              Hapus Semua
            </button>
          )}
          <button
            type="button"
            className="material-upload-btn"
            onClick={onOpenUpload}
            disabled={loading}
            aria-label="Upload file materi"
          >
            <img src={uploadIcon} alt="" className="material-upload-icon" />
          </button>
        </div>
        {errors.fileName && (
          <span className="material-form-error">{errors.fileName}</span>
        )}
      </div>

      {!isAddMode && (
        <div className="material-form-group">
          <label htmlFor={`${mode}-material-title`} className="material-form-label">
            Judul Materi
          </label>
          <input
            id={`${mode}-material-title`}
            value={editForm.title}
            onChange={(event) =>
              setEditForm((prev) => ({ ...prev, title: event.target.value }))
            }
            className={`material-form-input ${errors.title ? "error" : ""}`}
            disabled={loading}
          />
          {errors.title && (
            <span className="material-form-error">{errors.title}</span>
          )}
        </div>
      )}

      {isAddMode && items.length > 0 && (
        <div className="material-form-group">
          <span className="material-form-label">File Materi Dipilih</span>
          <div className="material-bulk-list">
            {items.map((item, index) => (
              <div className="material-bulk-item" key={item.id}>
                <span className="material-bulk-index">{index + 1}</span>
                <div className="material-bulk-fields">
                  <div className="material-bulk-file-row">
                    <span className="material-bulk-file">📄 {item.fileName}</span>
                    <button
                      type="button"
                      className="material-remove-file-btn"
                      onClick={() => setSelectedMaterial(item)}
                      disabled={loading}
                    >
                      Hapus
                    </button>
                  </div>
                  <label
                    className="material-bulk-title-label"
                    htmlFor={`${mode}-material-title-${item.id}`}
                  >
                    Judul Materi
                  </label>
                  <input
                    id={`${mode}-material-title-${item.id}`}
                    value={item.title}
                    onChange={(event) => updateItemTitle(item.id, event.target.value)}
                    className={`material-form-input ${
                      errors.itemTitles?.[item.id] ? "error" : ""
                    }`}
                    disabled={loading}
                  />
                  {errors.itemTitles?.[item.id] && (
                    <span className="material-form-error">
                      {errors.itemTitles[item.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="material-submit-btn" disabled={loading}>
        {isAddMode
          ? `+ Tambah Materi${items.length > 1 ? ` (${items.length})` : ""}`
          : "Simpan"}
      </button>

      <DeleteMaterialUploadDialog
        isOpen={Boolean(selectedMaterial)}
        onConfirm={confirmRemoveSelectedFile}
        onCancel={() => setSelectedMaterial(null)}
      />
    </form>
  );
}

function MaterialForm(props) {
  const formKey = `${props.mode ?? "add"}-${props.material?.id ?? "new"}-${
    props.resetSignal ?? 0
  }`;

  return <MaterialFormContent key={formKey} {...props} />;
}

export default MaterialForm;
