import { useEffect, useState } from "react";
import uploadIcon from "../../assets/icons/icon-upload.svg";
import "./MaterialForm.css";

const initialForm = {
  title: "",
  fileName: "",
  fileType: "",
  file: null,
  items: [],
};

const createItemId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function MaterialForm({
  mode = "add",
  material,
  onSubmit,
  onOpenUpload,
  selectedFileName,
  selectedFile,
  selectedFiles,
  onSelectedFilesChange,
  resetSignal = 0,
  loading = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === "edit" && material) {
      setForm({
        id: material.id,
        title: material.title,
        fileName: material.fileName,
        fileType: material.fileType || "",
        file: material.file || null,
      });
    } else {
      setForm(initialForm);
    }
    setErrors({});
  }, [mode, material]);

  useEffect(() => {
    if (selectedFileName === undefined) return;

    setForm((prev) => ({ ...prev, fileName: selectedFileName }));
  }, [selectedFileName]);

  useEffect(() => {
    if (mode !== "add" || !selectedFiles) return;

    if (selectedFiles.length === 0) {
      setForm((prev) => ({
        ...prev,
        fileName: "",
        fileType: "",
        file: null,
        items: [],
      }));
      return;
    }

    setForm((prev) => {
      const items = selectedFiles.map((selected) => {
        const existingItem = prev.items.find((item) => item.file === selected.file);

        return existingItem ?? {
          id: createItemId(),
          file: selected.file,
          fileName: selected.fileName,
          fileType: selected.fileType,
          title: "",
        };
      });

      return {
        ...prev,
        file: null,
        fileName: items.length === 1 ? items[0].fileName : `${items.length} file dipilih`,
        fileType: "",
        items,
      };
    });
  }, [mode, selectedFiles]);

  useEffect(() => {
    if (mode !== "edit" || !selectedFile) return;

    setForm((prev) => ({
      ...prev,
      file: selectedFile.file,
      fileName: selectedFile.fileName,
      fileType: selectedFile.fileType,
      items: [],
    }));
  }, [mode, selectedFile]);

  useEffect(() => {
    if (mode !== "add" || resetSignal === 0) return;

    setForm(initialForm);
    setErrors({});
  }, [mode, resetSignal]);

  function validate() {
    const nextErrors = {};

    if (!form.fileName) nextErrors.fileName = "Upload File Materi wajib diisi";

    if (mode === "add") {
      const itemTitles = {};
      form.items.forEach((item) => {
        if (!item.title.trim()) itemTitles[item.id] = "Judul Materi wajib diisi";
      });
      if (Object.keys(itemTitles).length > 0) nextErrors.itemTitles = itemTitles;
    } else if (!form.title.trim()) {
      nextErrors.title = "Judul Materi wajib diisi";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function removeSelectedFile(indexToRemove = 0) {
    setErrors({});

    const currentItems = form.items;
    const nextItems = currentItems.filter((_, index) => index !== indexToRemove);

    onSelectedFilesChange?.(
      nextItems.map(({ file, fileName, fileType }) => ({
        file,
        fileName,
        fileType,
      }))
    );

    if (nextItems.length === 0) {
      setForm((prev) => ({
        ...prev,
        fileName: "",
        fileType: "",
        file: null,
        items: [],
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: null,
      fileName: nextItems.length === 1 ? nextItems[0].fileName : `${nextItems.length} file dipilih`,
      fileType: "",
      items: nextItems,
    }));
  }

  function clearSelectedFiles() {
    setErrors({});
    onSelectedFilesChange?.([]);
    setForm((prev) => ({
      ...prev,
      fileName: "",
      fileType: "",
      file: null,
      items: [],
    }));
  }

  function updateItemTitle(id, title) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, title } : item
      ),
    }));
    setErrors((prev) => {
      if (!prev.itemTitles?.[id]) return prev;

      const itemTitles = { ...prev.itemTitles };
      delete itemTitles[id];
      return { ...prev, itemTitles };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "add" && form.items.length > 1) {
      onSubmit({ items: form.items });
      return;
    }

    if (mode === "add") {
      const [item] = form.items;
      onSubmit({ ...form, ...item, items: [] });
      return;
    }

    onSubmit(form);
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
            value={form.fileName}
            readOnly
            className={`material-form-input ${errors.fileName ? "error" : ""}`}
            placeholder=""
          />
          {form.items.length > 1 && mode === "add" && (
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

      {mode === "edit" && (
      <div className="material-form-group">
        <label htmlFor={`${mode}-material-title`} className="material-form-label">
          Judul Materi
        </label>
        <input
          id={`${mode}-material-title`}
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className={`material-form-input ${errors.title ? "error" : ""}`}
          disabled={loading}
        />
        {errors.title && (
          <span className="material-form-error">{errors.title}</span>
        )}
      </div>
      )}

      {mode === "add" && form.items.length > 0 && (
        <div className="material-form-group">
          <span className="material-form-label">File Materi Dipilih</span>
          <div className="material-bulk-list">
            {form.items.map((item, index) => (
              <div className="material-bulk-item" key={item.id}>
                <span className="material-bulk-index">{index + 1}</span>
                <div className="material-bulk-fields">
                  <div className="material-bulk-file-row">
                    <span className="material-bulk-file">📄 {item.fileName}</span>
                    <button
                      type="button"
                      className="material-remove-file-btn"
                      onClick={() => removeSelectedFile(index)}
                      disabled={loading}
                    >
                      Hapus
                    </button>
                  </div>
                  <label className="material-bulk-title-label" htmlFor={`${mode}-material-title-${item.id}`}>
                    Judul Materi
                  </label>
                  <input
                    id={`${mode}-material-title-${item.id}`}
                    value={item.title}
                    onChange={(e) => updateItemTitle(item.id, e.target.value)}
                    className={`material-form-input ${errors.itemTitles?.[item.id] ? "error" : ""}`}
                    disabled={loading}
                  />
                  {errors.itemTitles?.[item.id] && (
                    <span className="material-form-error">{errors.itemTitles[item.id]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="material-submit-btn" disabled={loading}>
        {mode === "edit" ? "Simpan" : `+ Tambah Materi${form.items.length > 1 ? ` (${form.items.length})` : ""}`}
      </button>
    </form>
  );
}

export default MaterialForm;
