import { useEffect, useState } from "react";
import DashboardLayout from "../dashboard/DashboardLayout";
import ExamTable from "./ExamTable";
import ExamForm from "./ExamForm";
import AddExamDialog from "./AddExamDialog";
import DeleteExamDialog from "./DeleteExamDialog";
import EditExamDialog from "./EditExamDialog";
import ConfirmEditDialog from "./ConfirmEditDialog";
import { useExam } from "../../hooks/useExam";
import "./ManageExamPage.css";

function ManageExamPage({ role }) {
  const {
    questions,
    selectedQuestion,
    isEditing,
    loading,
    showDeleteDialog,
    deletingId,
    errors,
    loadQuestions,
    validateQuestion,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    handleEdit,
    handleDelete,
    resetForm,
    closeDeleteDialog,
  } = useExam();
  const [pendingAddQuestion, setPendingAddQuestion] = useState(null);
  const [pendingEditQuestion, setPendingEditQuestion] = useState(null);
  const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false);
  const [addFormResetSignal, setAddFormResetSignal] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleAddSubmit = (formData) => {
    if (!validateQuestion(formData)) return;

    setPendingAddQuestion({
      ...formData,
      options: { ...formData.options },
    });
  };

  const handleConfirmAdd = async () => {
    if (!pendingAddQuestion) return;

    const success = await addQuestion(pendingAddQuestion);
    if (success) {
      setPendingAddQuestion(null);
      setAddFormResetSignal((current) => current + 1);
      setToast("Soal berhasil ditambahkan.");
      resetForm();
    }
  };

  const handleEditSubmit = (formData, questionId) => {
    if (!questionId) return;

    setPendingEditQuestion({ id: questionId, formData });
    setShowConfirmEditDialog(true);
  };

  const handleCloseConfirmEdit = () => {
    setShowConfirmEditDialog(false);
    setPendingEditQuestion(null);
  };

  const handleConfirmEdit = async () => {
    if (!pendingEditQuestion) return;

    const success = await updateQuestion(
      pendingEditQuestion.id,
      pendingEditQuestion.formData
    );

    if (success) {
      resetForm();
      setToast("Soal berhasil diperbarui.");
      setShowConfirmEditDialog(false);
      setPendingEditQuestion(null);
    }
  };

  const handleConfirmDelete = async () => {
    const success = await deleteQuestion(deletingId);
    if (success) closeDeleteDialog();
  };

  return (
    <DashboardLayout role={role}>
      <div className="manage-exam-page">
        <h1 className="manage-exam-title">Kelola Ujian</h1>

        <section className="manage-exam-section">
          <h2 className="manage-exam-section-title">Daftar Soal</h2>
          <ExamTable
            questions={questions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>

        <section className="manage-exam-form-section">
          <ExamForm
            mode="add"
            selectedQuestion={null}
            onSubmit={handleAddSubmit}
            onCancel={resetForm}
            errors={errors}
            loading={loading}
            resetSignal={addFormResetSignal}
          />
        </section>
      </div>

      <AddExamDialog
        isOpen={Boolean(pendingAddQuestion)}
        onConfirm={handleConfirmAdd}
        onCancel={() => setPendingAddQuestion(null)}
        isLoading={loading}
      />

      <EditExamDialog
        isOpen={isEditing}
        selectedQuestion={selectedQuestion}
        onSubmit={handleEditSubmit}
        onCancel={resetForm}
        errors={errors}
        loading={loading}
      />

      <ConfirmEditDialog
        open={showConfirmEditDialog}
        onClose={handleCloseConfirmEdit}
        onConfirm={handleConfirmEdit}
        loading={loading}
      />

      <DeleteExamDialog
        isOpen={showDeleteDialog}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
        isLoading={loading}
      />

      {toast && <div className="manage-exam-toast">{toast}</div>}
    </DashboardLayout>
  );
}

export default ManageExamPage;
