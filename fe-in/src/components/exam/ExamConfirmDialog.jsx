import { useEffect, useRef } from "react";

function ExamConfirmDialog({ title, onConfirm, onCancel, busy = false, confirmLabel = "Ya", cancelLabel = "Tidak" }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="pretest-modal-backdrop" role="presentation">
      <section className="pretest-modal" role="alertdialog" aria-modal="true" aria-labelledby="exam-confirm-title">
        <h2 id="exam-confirm-title">{title}</h2>
        <div className="pretest-modal-actions">
          <button ref={confirmRef} type="button" className="pretest-modal-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? "Mengirim..." : confirmLabel}
          </button>
          <button type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        </div>
      </section>
    </div>
  );
}

export default ExamConfirmDialog;
