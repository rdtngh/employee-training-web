import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamConfirmDialog from "../../components/exam/ExamConfirmDialog";
import ExamResultCard from "../../components/exam/ExamResultCard";
import TrainingSelectionCard from "../../components/employee/TrainingSelectionCard";
import { useSessionAnswers } from "../../hooks/useSessionAnswers";
import * as examService from "../../services/examService";
import * as trainingService from "../../services/trainingService";
import "./EmployeePreTest.css";

const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? response;

const loadErrorMessage = (error) => {
  if (error.response?.status === 401) {
    return "Sesi login sudah tidak aktif. Silakan login ulang sebagai karyawan.";
  }

  if (error.response?.status === 403) {
    return error.response?.data?.message || "Akses ditolak. Silakan login sebagai karyawan.";
  }

  return "Pre-Test gagal dimuat. Silakan coba lagi.";
};

function EmployeePreTest() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [exam, setExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { answers, setAnswers, clearAnswers } = useSessionAnswers(`rsabl-pretest-answers-${trainingId || "list"}`);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [startedMs, setStartedMs] = useState(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(trainingId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    trainingService
      .getTrainings()
      .then((data) => {
        if (active) setTrainings(data);
      })
      .catch(() => {
        if (active) setTrainingError("Daftar pelatihan gagal dimuat.");
      })
      .finally(() => {
        if (active) setTrainingLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!trainingId) {
      return undefined;
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      setExam(null);
      setResult(null);
      setCurrentIndex(0);
      setStarted(false);
      setStartedAt(null);
      setStartedMs(null);
      setShowStartDialog(false);
      setShowSubmitDialog(false);
      examService.getPreTest(trainingId)
        .then((response) => {
          if (!active) return;
          const data = unwrapResponse(response);
          if (data?.result) setResult(data.result);
          else {
            setExam(data);
            setShowStartDialog(true);
          }
        })
        .catch((error) => active && setError(loadErrorMessage(error)))
        .finally(() => active && setLoading(false));
    });
    return () => { active = false; };
  }, [trainingId]);

  const questions = exam?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const optionEntries = currentQuestion
    ? Array.isArray(currentQuestion.options)
      ? currentQuestion.options.map((option) => [option.id, option.text ?? option.label])
      : Object.entries(currentQuestion.options ?? {})
    : [];

  const submitAnswers = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await examService.submitPreTest({
        test_id: exam.test.id,
        training_id: trainingId,
        answers: questions.map((question) => ({
          question_id: question.id,
          answer: answers[question.id],
        })),
        started_at: startedAt,
        elapsed_seconds: startedMs === null ? undefined : Math.max(1, Math.round((performance.now() - startedMs) / 1000)),
      });
      setResult(unwrapResponse(response));
      clearAnswers();
      setShowSubmitDialog(false);
    } catch {
      setError("Jawaban gagal dikirim. Silakan coba lagi.");
      setShowSubmitDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="employee">
      <section className="employee-pretest-page">
        {loading && <p className="pretest-status">Memuat Pre-Test...</p>}
        {error && <p className="pretest-error" role="alert">{error}</p>}

        {!trainingId && (
          <TrainingSelectionCard
            title="Pre-Test"
            trainings={trainings}
            loading={trainingLoading}
            error={trainingError}
            actionLabel="Kerjakan Pre-Test"
            onSelectTraining={(training) => navigate(`/employee/pretest/${training.id}`)}
          />
        )}

        {trainingId && !loading && result && (
          <ExamResultCard result={result} />
        )}

        {trainingId && !loading && !result && currentQuestion && (
          <div className={`pretest-exam${started ? "" : " is-blocked"}`}>
            <article className="pretest-question-card">
              <p className="pretest-question-number">Q{currentIndex + 1}</p>
              <h1>{currentQuestion.question}</h1>
              <div className="pretest-options">
                {optionEntries.map(([optionId, optionText], optionIndex) => (
                  <label key={optionId} className={answers[currentQuestion.id] === optionId ? "selected" : ""}>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={optionId}
                      checked={answers[currentQuestion.id] === optionId}
                      onChange={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: optionId }))}
                    />
                    <span>{String.fromCharCode(65 + optionIndex)}.</span>
                    <span>{optionText}</span>
                  </label>
                ))}
              </div>
            </article>
            <div className="pretest-navigation">
              {currentIndex > 0 && <button type="button" onClick={() => setCurrentIndex((index) => index - 1)}>← Back</button>}
              <button
                type="button"
                className="pretest-next"
                disabled={!answers[currentQuestion.id]}
                onClick={() => currentIndex === questions.length - 1
                  ? setShowSubmitDialog(true)
                  : setCurrentIndex((index) => index + 1)}
              >
                {currentIndex === questions.length - 1 ? "Submit" : "Next →"}
              </button>
            </div>
          </div>
        )}

        {trainingId && !loading && !result && !currentQuestion && !error && (
          <p className="pretest-status">Pre-Test belum tersedia untuk pelatihan ini.</p>
        )}

        {trainingId && (
          <button
            type="button"
            className="employee-training-back"
            onClick={() => navigate("/employee/pretest")}
          >
            &larr; Back
          </button>
        )}
      </section>

      {showStartDialog && (
        <ExamConfirmDialog
          title="Yakin ingin mengerjakan Pre-Test sekarang?"
          onConfirm={() => {
            setStarted(true);
            setStartedAt(new Date().toISOString());
            setStartedMs(performance.now());
            setShowStartDialog(false);
          }}
          onCancel={() => setShowStartDialog(false)}
        />
      )}
      {showSubmitDialog && (
        <ExamConfirmDialog
          title="Yakin ingin mengumpulkan Pre-Test?"
          onConfirm={submitAnswers}
          onCancel={() => setShowSubmitDialog(false)}
          busy={submitting}
        />
      )}
    </DashboardLayout>
  );
}

export default EmployeePreTest;
