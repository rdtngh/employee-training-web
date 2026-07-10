import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamTable from "../../components/exam/ExamTable";
import ExamForm from "../../components/exam/ExamForm";
import AddExamDialog from "../../components/exam/AddExamDialog";
import DeleteExamDialog from "../../components/exam/DeleteExamDialog";
import EditExamDialog from "../../components/exam/EditExamDialog";
import ConfirmEditDialog from "../../components/exam/ConfirmEditDialog";
import { useExam } from "../../hooks/useExam";
import "./ManageExam.css";

function ManageExam() {
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


  // Load data saat component mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Handle form submit tambah soal
  const handleAddSubmit = (formData) => {
    if (!validateQuestion(formData)) return;

    setPendingAddQuestion({
      ...formData,
      options: { ...formData.options },
    });
  };

  // Handle konfirmasi tambah soal
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

  // Handle submit edit: simpan data dulu, tampilkan popup konfirmasi
  const handleEditSubmit = (formData, questionId) => {
    if (!questionId) return;

    setPendingEditQuestion({
      id: questionId,
      formData,
    });
    setShowConfirmEditDialog(true);
  };

  const handleCloseConfirmEdit = () => {
    // Batal: tutup popup, jangan reset form edit (input tetap ada)
    setShowConfirmEditDialog(false);
    setPendingEditQuestion(null);
  };


  const handleConfirmEdit = async () => {
    if (!pendingEditQuestion) return;

    // Submit update hanya setelah user mengonfirmasi
    const success = await updateQuestion(
      pendingEditQuestion.id,
      pendingEditQuestion.formData
    );


    if (success) {
      // Kembalikan form ke mode Tambah Soal (dan kosong)
      resetForm();
      setToast("Soal berhasil diperbarui.");
      setShowConfirmEditDialog(false);
      setPendingEditQuestion(null);
    }
  };


  // Handle konfirmasi delete
  const handleConfirmDelete = async () => {
    const success = await deleteQuestion(deletingId);
    if (success) {
      closeDeleteDialog();
    }
  };

  return (
    <DashboardLayout role="superadmin">
      <div className="manage-exam-page">
        <h1 className="manage-exam-title">Kelola Ujian</h1>

        {/* Section 1: Daftar Soal */}
        <section className="manage-exam-section">
          <h2 className="manage-exam-section-title">Daftar Soal</h2>
          <ExamTable
            questions={questions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>

        {/* Section 2: Form Tambah Soal */}
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

      {/* Add Confirmation Dialog */}
      <AddExamDialog
        isOpen={Boolean(pendingAddQuestion)}
        onConfirm={handleConfirmAdd}
        onCancel={() => setPendingAddQuestion(null)}
        isLoading={loading}
      />

      {/* Edit Dialog */}
      <EditExamDialog
        isOpen={isEditing}
        selectedQuestion={selectedQuestion}
        onSubmit={handleEditSubmit}
        onCancel={resetForm}
        errors={errors}
        loading={loading}
      />

      {/* Confirm Edit Dialog */}
      <ConfirmEditDialog
        open={showConfirmEditDialog}
        onClose={handleCloseConfirmEdit}
        onConfirm={handleConfirmEdit}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
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

export default ManageExam;
