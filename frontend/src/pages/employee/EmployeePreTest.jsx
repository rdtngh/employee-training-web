import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamConfirmDialog from "../../components/exam/ExamConfirmDialog";
import ExamResultCard from "../../components/exam/ExamResultCard";
import { useSessionAnswers } from "../../hooks/useSessionAnswers";
import * as examService from "../../services/examService";
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
  const [exam, setExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { answers, setAnswers, clearAnswers } = useSessionAnswers("rsabl-pretest-answers");
  const [started, setStarted] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    examService.getPreTest()
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
    return () => { active = false; };
  }, []);

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
        answers: questions.map((question) => ({
          question_id: question.id,
          answer: answers[question.id],
        })),
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

        {!loading && result && (
          <ExamResultCard result={result} />
        )}

        {!loading && !result && currentQuestion && (
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

        {!loading && !result && !currentQuestion && !error && (
          <p className="pretest-status">Belum ada soal Pre-Test.</p>
        )}
      </section>

      {showStartDialog && (
        <ExamConfirmDialog
          title="Yakin ingin mengerjakan Pre-Test sekarang?"
          onConfirm={() => { setStarted(true); setShowStartDialog(false); }}
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
