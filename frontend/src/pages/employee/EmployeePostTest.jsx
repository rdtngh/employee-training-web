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
import "./EmployeePostTest.css";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const loadErrorMessage = (error) => {
  if (error.response?.status === 401) {
    return "Sesi login sudah tidak aktif. Silakan login ulang sebagai karyawan.";
  }

  if (error.response?.status === 403) {
    return error.response?.data?.message || "Akses ditolak. Silakan login sebagai karyawan.";
  }

  return "Post-Test gagal dimuat. Silakan coba lagi.";
};

function EmployeePostTest() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const [trainings, setTrainings] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState("");
  const [data, setData] = useState(null);
  const [result, setResult] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { answers, setAnswers, clearAnswers } = useSessionAnswers(`rsabl-posttest-answers-${trainingId || "list"}`);
  const [started, setStarted] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [loading, setLoading] = useState(Boolean(trainingId));
  const [busy, setBusy] = useState(false);
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
      setData(null);
      setResult(null);
      setCurrentIndex(0);
      setStarted(false);
      setShowStart(false);
      setShowSubmit(false);
      examService.getPostTest(trainingId)
        .then((rawResponse) => {
          if (!active) return;
          const response = unwrap(rawResponse);
          setData(response);
          if (["PASSED", "FAILED"].includes(response.post_test?.status)) {
            setResult(response.post_test);
          } else if (response.materials_completed) {
            setShowStart(true);
          }
        })
        .catch((error) => active && setError(loadErrorMessage(error)))
        .finally(() => active && setLoading(false));
    });
    return () => { active = false; };
  }, [trainingId]);

  const questions = data?.questions ?? [];
  const question = questions[currentIndex];
  const options = question ? Object.entries(question.options ?? {}) : [];
  const resultPassed = result?.passed ?? result?.status === "PASSED";

  const submit = async () => {
    setBusy(true);
    try {
      const response = unwrap(await examService.submitPostTest({
        post_test_id: data.post_test.id,
        training_id: data.training.id,
        answers: questions.map((item) => ({ question_id: item.id, answer: answers[item.id] })),
      }));
      setResult(response);
      clearAnswers();
      setShowSubmit(false);
    } catch {
      setError("Jawaban Post-Test gagal dikirim. Silakan coba lagi.");
      setShowSubmit(false);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      const response = unwrap(await examService.retryPostTest(data.training.id));
      setData(response);
      setResult(null);
      clearAnswers();
      setCurrentIndex(0);
      setStarted(false);
      setShowStart(true);
    } catch {
      setError("Post-Test tidak dapat diulang saat ini.");
    } finally {
      setBusy(false);
    }
  };

  const previewCertificate = () => {
    navigate(`/employee/certificate/${data.training.id}`);
  };

  return (
    <DashboardLayout role="employee">
      <section className="employee-pretest-page">
        {loading && <p>Memuat Post-Test...</p>}
        {error && <p className="pretest-error" role="alert">{error}</p>}

        {!trainingId && (
          <TrainingSelectionCard
            title="Post-Test"
            trainings={trainings}
            loading={trainingLoading}
            error={trainingError}
            actionLabel="Kerjakan Post-Test"
            onSelectTraining={(training) => navigate(`/employee/posttest/${training.id}`)}
          />
        )}

        {trainingId && !loading && result && (
          <ExamResultCard result={result} className="posttest-result">
            {resultPassed && result.certificate_available && (
              <div className="posttest-certificate-actions">
                <button type="button" className="posttest-certificate" onClick={previewCertificate} disabled={busy}>Lihat Sertifikat</button>
              </div>
            )}
            {!resultPassed && result.can_retry && (
              <button type="button" className="posttest-retry" onClick={retry} disabled={busy}>Re Attempt →</button>
            )}
          </ExamResultCard>
        )}

        {trainingId && !loading && !result && question && (
          <div className={`pretest-exam${started ? "" : " is-blocked"}`}>
            <article className="pretest-question-card">
              <p className="pretest-question-number">Q{currentIndex + 1} / {questions.length}</p>
              <h1>{question.question}</h1>
              <div className="pretest-options">
                {options.map(([optionId, text], optionIndex) => (
                  <label key={optionId} className={answers[question.id] === optionId ? "selected" : ""}>
                    <input type="radio" name={`question-${question.id}`} checked={answers[question.id] === optionId} onChange={() => setAnswers((old) => ({ ...old, [question.id]: optionId }))} />
                    <span>{String.fromCharCode(65 + optionIndex)}.</span><span>{text}</span>
                  </label>
                ))}
              </div>
            </article>
            <div className="pretest-navigation">
              {currentIndex > 0 && <button type="button" onClick={() => setCurrentIndex((index) => index - 1)}>← Back</button>}
              <button type="button" className="pretest-next" disabled={!answers[question.id]} onClick={() => currentIndex === questions.length - 1 ? setShowSubmit(true) : setCurrentIndex((index) => index + 1)}>
                {currentIndex === questions.length - 1 ? "Submit" : "Next →"}
              </button>
            </div>
          </div>
        )}

        {trainingId && !loading && !result && !question && data?.materials_completed && !error && (
          <p className="pretest-status">Post-Test belum tersedia untuk pelatihan ini.</p>
        )}

        {trainingId && (
          <button
            type="button"
            className="employee-training-back"
            onClick={() => navigate("/employee/posttest")}
          >
            &larr; Back
          </button>
        )}
      </section>

      {trainingId && !loading && data && !data.materials_completed && (
        <div className="posttest-locked-overlay">
          <section className="posttest-locked-dialog" role="alertdialog" aria-modal="true">
            <h2>Anda belum Mengakses Materi.</h2>
            <p>Akses Materi Untuk membuka Post-Test!</p>
          </section>
        </div>
      )}
      {showStart && <ExamConfirmDialog title="Yakin ingin mengerjakan Post-Test sekarang?" onConfirm={() => { setStarted(true); setShowStart(false); }} onCancel={() => navigate(-1)} busy={busy} />}
      {showSubmit && <ExamConfirmDialog title="Yakin ingin mengumpulkan Post-Test?" onConfirm={submit} onCancel={() => setShowSubmit(false)} busy={busy} />}
    </DashboardLayout>
  );
}

export default EmployeePostTest;
