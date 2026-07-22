import { useRef, useState } from "react";
import {
  MATERIAL_FILE_ACCEPT,
  MATERIAL_FILE_EXTENSIONS,
  MATERIAL_FILE_FORMAT_LABEL,
  MATERIAL_FILE_MAX_SIZE_MB,
} from "../../constants/materialFiles";
import "./UploadMaterialDialog.css";

function UploadMaterialDialog({ isOpen, onSelectFile, onCancel, multiple = false }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function isAllowedFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const maxSize = MATERIAL_FILE_MAX_SIZE_MB * 1024 * 1024;

    return extension && MATERIAL_FILE_EXTENSIONS.includes(extension) && file.size <= maxSize;
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.some((file) => !isAllowedFile(file))) {
      setError(
        `Pilih file dengan format yang didukung dan ukuran maksimal ${MATERIAL_FILE_MAX_SIZE_MB}MB.`
      );
      e.target.value = "";
      return;
    }

    setError("");

    if (multiple) {
      onSelectFile(files.map((file) => ({
        file,
        fileName: file.name,
        fileType: file.type,
      })));
      return;
    }

    const file = files[0];
    onSelectFile({
      file,
      fileName: file.name,
      fileType: file.type,
    });
  }

  return (
    <div className="upload-material-overlay">
      <div className="upload-material-dialog" role="dialog" aria-modal="true">
        <h3 className="upload-material-title">Upload File Materi</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept={MATERIAL_FILE_ACCEPT}
          multiple={multiple}
          className="upload-material-input"
          onChange={handleFileChange}
        />
        <p className="upload-material-help">
          Format: {MATERIAL_FILE_FORMAT_LABEL}. Maksimal {MATERIAL_FILE_MAX_SIZE_MB}MB per file.
        </p>
        {error && <p className="upload-material-error">{error}</p>}
        <div className="upload-material-actions">
          <button
            type="button"
            className="upload-material-btn upload-material-btn-cancel"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="upload-material-btn upload-material-btn-select"
            onClick={() => fileInputRef.current?.click()}
          >
            Pilih File
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadMaterialDialog;
