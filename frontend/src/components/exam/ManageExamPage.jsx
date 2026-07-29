import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../dashboard/DashboardLayout";
import ExamTable from "./ExamTable";
import ExamForm from "./ExamForm";
import AddExamDialog from "./AddExamDialog";
import DeleteExamDialog from "./DeleteExamDialog";
import EditExamDialog from "./EditExamDialog";
import ConfirmEditDialog from "./ConfirmEditDialog";
import ImportExamDialog from "./ImportExamDialog";
import { useExam } from "../../hooks/useExam";
import * as examService from "../../services/examService";
import * as trainingService from "../../services/trainingService";
import listIcon from "../../assets/icons/icon-daftar-materi.svg";
import "./ManageExamPage.css";

const TEST_TYPES = [
  { value: "pretest", label: "Pre-Test" },
  { value: "posttest", label: "Post-Test" },
];

function ManageExamPage({ role }) {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const rolePath = role === "superadmin" ? "superadmin" : "admin";
  const [activeType, setActiveType] = useState("pretest");
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [pendingAddQuestion, setPendingAddQuestion] = useState(null);
  const [pendingEditQuestion, setPendingEditQuestion] = useState(null);
  const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [addFormResetSignal, setAddFormResetSignal] = useState(0);
  const [toast, setToast] = useState("");
  const selectedTraining = trainings.find((training) => String(training.id) === String(trainingId));

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
  } = useExam({ trainingId, testType: activeType });

  const loadTrainings = useCallback(async () => {
    setTrainingLoading(true);
    try {
      const data = await trainingService.getTrainings();
      setTrainings(data);
      setTrainingError("");
    } catch {
      setTrainingError("Daftar pelatihan gagal dimuat.");
    } finally {
      setTrainingLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) loadTrainings();
    });

    return () => {
      active = false;
    };
  }, [loadTrainings]);

  useEffect(() => {
    if (trainingId) loadQuestions();
  }, [trainingId, activeType, loadQuestions]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentTypeLabel = TEST_TYPES.find((type) => type.value === activeType)?.label ?? "Pre-Test";

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
    if (success) {
      closeDeleteDialog();
      setToast("Soal berhasil dihapus.");
    }
  };

  const handlePreviewImport = (file) =>
    examService.previewExamImport({
      trainingId,
      type: activeType,
      file,
    });

  const handleConfirmImport = async (previewQuestions) => {
    await examService.importExamQuestions({
      trainingId,
      type: activeType,
      questions: previewQuestions,
    });
    await loadQuestions();
    setShowImportDialog(false);
    setToast("Soal berhasil diimport.");
  };

  return (
    <DashboardLayout role={role}>
      <div className="manage-exam-page">
        {!trainingId && (
          <section className="manage-exam-card">
            <div className="manage-exam-header">
              <img src={listIcon} alt="" className="manage-exam-header-icon" />
              <h1 className="manage-exam-title">Daftar Pelatihan</h1>
            </div>

            {trainingLoading && <p className="manage-exam-state">Memuat pelatihan...</p>}
            {trainingError && (
              <p className="manage-exam-state manage-exam-error" role="alert">
                {trainingError}
              </p>
            )}

            {!trainingLoading && !trainingError && (
              <div className="manage-exam-table-wrap">
                <table className="manage-exam-training-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Daftar Pelatihan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="manage-exam-table-empty">
                          Belum ada pelatihan.
                        </td>
                      </tr>
                    ) : (
                      trainings.map((training, index) => (
                        <tr key={training.id}>
                          <td data-label="No">{index + 1}</td>
                          <td data-label="Daftar Pelatihan">{training.title}</td>
                          <td data-label="Aksi">
                            <button
                              type="button"
                              className="manage-exam-action manage-exam-action-open"
                              onClick={() => navigate(`/${rolePath}/manage-exam/${training.id}`)}
                            >
                              Lihat Ujian
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {trainingId && (
          <>
            <section className="manage-exam-card">
              <div className="manage-exam-detail-header">
                <div className="manage-exam-header">
                  <img src={listIcon} alt="" className="manage-exam-header-icon" />
                  <div>
                    <h1 className="manage-exam-title">Daftar Soal</h1>
                    <p className="manage-exam-training-name">
                      Pelatihan: {selectedTraining?.title ?? "Memuat pelatihan..."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="manage-exam-import-btn"
                  onClick={() => setShowImportDialog(true)}
                  disabled={!selectedTraining}
                >
                  Import Soal
                </button>
              </div>

              <div className="manage-exam-tabs" role="tablist" aria-label="Tipe ujian">
                {TEST_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`manage-exam-tab ${activeType === type.value ? "active" : ""}`}
                    onClick={() => {
                      setActiveType(type.value);
                      resetForm();
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <h2 className="manage-exam-section-title">{currentTypeLabel}</h2>
              <ExamTable
                questions={questions}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyMessage={`Belum ada soal ${currentTypeLabel} pada pelatihan ini.`}
              />

              <button
                type="button"
                className="manage-exam-back"
                onClick={() => navigate(`/${rolePath}/manage-exam`)}
              >
                &larr; Back
              </button>
            </section>

            <section className="manage-exam-form-section">
              <ExamForm
                mode="add"
                selectedQuestion={null}
                onSubmit={handleAddSubmit}
                onCancel={resetForm}
                errors={errors}
                loading={loading}
                resetSignal={`${activeType}-${addFormResetSignal}`}
              />
            </section>
          </>
        )}
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

      {showImportDialog && (
        <ImportExamDialog
          isOpen
          training={selectedTraining}
          testTypeLabel={currentTypeLabel}
          onPreview={handlePreviewImport}
          onConfirm={handleConfirmImport}
          onCancel={() => setShowImportDialog(false)}
        />
      )}

      {toast && <div className="manage-exam-toast">{toast}</div>}
    </DashboardLayout>
  );
}

export default ManageExamPage;
