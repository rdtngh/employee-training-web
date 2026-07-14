import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as examService from "../../services/examService";
import passedIcon from "../../assets/icons/icon-lulus.svg";
import failedIcon from "../../assets/icons/icon-tidaklulus.svg";
import "./EmployeePreTest.css";

const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? response;

function ConfirmDialog({ title, confirmLabel = "Ya", onConfirm, onCancel, busy = false }) {
  return (
    <div className="pretest-modal-backdrop">
      <section className="pretest-modal" role="alertdialog" aria-modal="true" aria-labelledby="pretest-modal-title">
        <h2 id="pretest-modal-title">{title}</h2>
        <div className="pretest-modal-actions">
          <button type="button" className="pretest-modal-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? "Mengirim..." : confirmLabel}
          </button>
          <button type="button" onClick={onCancel} disabled={busy}>Tidak</button>
        </div>
      </section>
    </div>
  );
}

function EmployeePreTest() {
  const [exam, setExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
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
      .catch(() => active && setError("Pre Test gagal dimuat. Silakan coba lagi."))
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
        {loading && <p className="pretest-status">Memuat Pre Test...</p>}
        {error && <p className="pretest-error" role="alert">{error}</p>}

        {!loading && result && (
          <div className={`pretest-result ${result.passed ? "passed" : "failed"}`}>
            <img src={result.passed ? passedIcon : failedIcon} alt="" />
            <h1>{result.passed ? "LULUS" : "TIDAK LULUS"}</h1>
            <dl>
              <div><dt>Score</dt><dd>{result.score}</dd></div>
              <div><dt>Benar</dt><dd>{result.correct_answers}</dd></div>
              <div><dt>Salah</dt><dd>{result.wrong_answers}</dd></div>
              <div><dt>Presentase</dt><dd>{result.percentage}%</dd></div>
            </dl>
          </div>
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
          <p className="pretest-status">Belum ada soal Pre Test.</p>
        )}
      </section>

      {showStartDialog && (
        <ConfirmDialog
          title="Yakin ingin mengerjakan Pre Test sekarang?"
          onConfirm={() => { setStarted(true); setShowStartDialog(false); }}
          onCancel={() => setShowStartDialog(false)}
        />
      )}
      {showSubmitDialog && (
        <ConfirmDialog
          title="Yakin ingin mengumpulkan Pre Test?"
          onConfirm={submitAnswers}
          onCancel={() => setShowSubmitDialog(false)}
          busy={submitting}
        />
      )}
    </DashboardLayout>
  );
}

export default EmployeePreTest;
