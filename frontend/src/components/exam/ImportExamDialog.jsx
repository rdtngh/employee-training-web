import { useState } from "react";

const optionLabels = ["A", "B", "C", "D"];

function ImportExamDialog({
  isOpen,
  training,
  testTypeLabel,
  onPreview,
  onConfirm,
  onCancel,
}) {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (!file) {
      setErrors(["Pilih file Word terlebih dahulu."]);
      return;
    }

    setPreviewLoading(true);
    setErrors([]);
    setQuestions([]);

    try {
      const data = await onPreview(file);
      setQuestions(data.questions ?? []);
      setErrors(data.errors ?? []);
    } catch (error) {
      const responseErrors =
        error.response?.data?.data?.errors ??
        Object.values(error.response?.data?.errors ?? {}).flat();

      setErrors(
        responseErrors.length > 0
          ? responseErrors
          : [error.response?.data?.message ?? "File Word gagal dibaca."]
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (questions.length === 0 || errors.length > 0) return;

    setConfirmLoading(true);
    setErrors([]);

    try {
      await onConfirm(questions);
    } catch (error) {
      const responseErrors =
        error.response?.data?.data?.errors ??
        Object.values(error.response?.data?.errors ?? {}).flat();

      setErrors(
        responseErrors.length > 0
          ? responseErrors
          : [error.response?.data?.message ?? "Import soal gagal disimpan."]
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const busy = previewLoading || confirmLoading;

  return (
    <div className="manage-exam-import-overlay">
      <div className="manage-exam-import-dialog" role="dialog" aria-modal="true">
        <h3 className="manage-exam-import-title">Import Soal</h3>
        <p className="manage-exam-import-meta">
          {training?.title ?? "Pelatihan"} - {testTypeLabel}
        </p>

        <div className="manage-exam-import-field">
          <label htmlFor="exam-import-file">File Word (.docx)</label>
          <input
            id="exam-import-file"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setQuestions([]);
              setErrors([]);
            }}
            disabled={busy}
          />
        </div>

        {errors.length > 0 && (
          <div className="manage-exam-import-errors" role="alert">
            {errors.map((error, index) => (
              <p key={`${error}-${index}`}>{error}</p>
            ))}
          </div>
        )}

        {questions.length > 0 && errors.length === 0 && (
          <div className="manage-exam-import-preview">
            <p className="manage-exam-import-preview-title">
              Preview {questions.length} soal
            </p>
            <div className="manage-exam-import-list">
              {questions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="manage-exam-import-item">
                  <p className="manage-exam-import-question">
                    {index + 1}. {question.question}
                  </p>
                  {question.image_preview_url && (
                    <img
                      className="manage-exam-import-image"
                      src={question.image_preview_url}
                      alt={`Ilustrasi soal ${index + 1}`}
                    />
                  )}
                  <div className="manage-exam-import-options">
                    {optionLabels.map((label) => (
                      <span
                        key={label}
                        className={question.correct_answer === label ? "active" : ""}
                      >
                        {label}. {question[`option_${label.toLowerCase()}`]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="manage-exam-import-actions">
          <button
            type="button"
            className="manage-exam-import-btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className="manage-exam-import-btn-secondary"
            onClick={handlePreview}
            disabled={busy}
          >
            {previewLoading ? "Membaca..." : "Preview"}
          </button>
          <button
            type="button"
            className="manage-exam-import-btn-primary"
            onClick={handleConfirm}
            disabled={busy || questions.length === 0 || errors.length > 0}
          >
            {confirmLoading ? "Menyimpan..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportExamDialog;
