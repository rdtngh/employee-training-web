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

const titleFromFileName = (fileName) =>
  fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
    if (!selectedFiles) return;

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

    if (selectedFiles.length === 1) {
      const [selected] = selectedFiles;
      setForm((prev) => ({
        ...prev,
        file: selected.file,
        fileName: selected.fileName,
        fileType: selected.fileType,
        items: [],
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: null,
      fileName: `${selectedFiles.length} file dipilih`,
      fileType: "",
      items: selectedFiles.map((selected) => ({
        file: selected.file,
        fileName: selected.fileName,
        fileType: selected.fileType,
        title: titleFromFileName(selected.fileName),
      })),
    }));
  }, [selectedFiles]);

  useEffect(() => {
    if (!selectedFile) return;

    setForm((prev) => ({
      ...prev,
      file: selectedFile.file,
      fileName: selectedFile.fileName,
      fileType: selectedFile.fileType,
      items: [],
    }));
  }, [selectedFile]);

  useEffect(() => {
    if (mode !== "add" || resetSignal === 0) return;

    setForm(initialForm);
    setErrors({});
  }, [mode, resetSignal]);

  function validate() {
    const nextErrors = {};

    if (!form.fileName) nextErrors.fileName = "Upload File Materi wajib diisi";

    if (!form.title.trim()) {
      nextErrors.title = "Judul Materi wajib diisi";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function removeSelectedFile(indexToRemove = 0) {
    setErrors({});

    const currentItems =
      form.items.length > 0
        ? form.items
        : form.file
          ? [
              {
                file: form.file,
                fileName: form.fileName,
                fileType: form.fileType,
                title: form.title || titleFromFileName(form.fileName),
              },
            ]
          : [];
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

      if (nextItems.length === 1) {
        const [nextItem] = nextItems;
        setForm((prev) => ({
          ...prev,
          title: prev.title || nextItem.title,
          file: nextItem.file,
          fileName: nextItem.fileName,
          fileType: nextItem.fileType,
        items: [],
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: null,
      fileName: `${nextItems.length} file dipilih`,
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

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(
      form.items.length > 1
        ? {
            items: form.items.map((item) => ({
              ...item,
              title: form.title,
            })),
          }
        : form
    );
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
          {form.fileName && mode === "add" && (
            <button
              type="button"
              className="material-clear-file-btn"
              onClick={form.items.length > 1 ? clearSelectedFiles : () => removeSelectedFile()}
              disabled={loading}
            >
              {form.items.length > 1 ? "Hapus Semua" : "Hapus"}
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

      {form.items.length > 1 && (
        <div className="material-form-group">
          <span className="material-form-label">File Materi Dipilih</span>
          <div className="material-bulk-list">
            {form.items.map((item, index) => (
              <div className="material-bulk-item" key={`${item.fileName}-${index}`}>
                <span className="material-bulk-index">{index + 1}</span>
                <div className="material-bulk-fields">
                  <div className="material-bulk-file-row">
                    <span className="material-bulk-file">{item.fileName}</span>
                    <button
                      type="button"
                      className="material-remove-file-btn"
                      onClick={() => removeSelectedFile(index)}
                      disabled={loading}
                    >
                      Hapus
                    </button>
                  </div>
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
