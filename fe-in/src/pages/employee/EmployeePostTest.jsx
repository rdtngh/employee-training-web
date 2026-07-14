import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import * as examService from "../../services/examService";
import * as certificateService from "../../services/certificateService";
import passedIcon from "../../assets/icons/icon-lulus.svg";
import failedIcon from "../../assets/icons/icon-tidaklulus.svg";
import "./EmployeePreTest.css";
import "./EmployeePostTest.css";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

function PostTestConfirm({ title, onConfirm, onCancel, busy, confirmLabel = "Ya", cancelLabel = "Tidak" }) {
  return (
    <div className="pretest-modal-backdrop">
      <section className="pretest-modal" role="alertdialog" aria-modal="true" aria-labelledby="posttest-confirm-title">
        <h2 id="posttest-confirm-title">{title}</h2>
        <div className="pretest-modal-actions">
          <button type="button" className="pretest-modal-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? "Mengirim..." : confirmLabel}
          </button>
          <button type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        </div>
      </section>
    </div>
  );
}

function EmployeePostTest() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [result, setResult] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    examService.getPostTest()
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
      .catch(() => active && setError("Post-Test gagal dimuat. Silakan coba lagi."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

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
      setAnswers({});
      setCurrentIndex(0);
      setStarted(false);
      setShowStart(true);
    } catch {
      setError("Post-Test tidak dapat diulang saat ini.");
    } finally {
      setBusy(false);
    }
  };

  const downloadCertificate = async () => {
    setBusy(true);
    try {
      const file = await certificateService.downloadCertificate(data.training.id);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Sertifikat gagal diunduh. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout role="employee">
      <section className="employee-pretest-page">
        {loading && <p>Memuat Post-Test...</p>}
        {error && <p className="pretest-error" role="alert">{error}</p>}

        {!loading && result && (
          <div className={`pretest-result posttest-result ${resultPassed ? "passed" : "failed"}`}>
            <img src={resultPassed ? passedIcon : failedIcon} alt="" />
            <h1>{resultPassed ? "LULUS" : "TIDAK LULUS"}</h1>
            <dl>
              <div><dt>Score</dt><dd>{result.score}</dd></div>
              <div><dt>Benar</dt><dd>{result.correct ?? result.correct_answers}</dd></div>
              <div><dt>Salah</dt><dd>{result.wrong ?? result.wrong_answers}</dd></div>
              <div><dt>Presentase</dt><dd>{result.percentage}%</dd></div>
            </dl>
            {resultPassed && result.certificate_available && (
              <button type="button" className="posttest-certificate" onClick={downloadCertificate} disabled={busy}>Download Sertifikat</button>
            )}
            {!resultPassed && result.can_retry && (
              <button type="button" className="posttest-retry" onClick={retry} disabled={busy}>Re Attempt →</button>
            )}
          </div>
        )}

        {!loading && !result && question && (
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
      </section>

      {!loading && data && !data.materials_completed && (
        <div className="posttest-locked-overlay">
          <section className="posttest-locked-dialog" role="alertdialog" aria-modal="true">
            <h2>Anda belum menyelesaikan semua Materi.</h2>
            <p>Selesaikan semua materi untuk memulai Post-Test!</p>
          </section>
        </div>
      )}
      {showStart && <PostTestConfirm title="Yakin ingin mengerjakan Post-Test sekarang?" onConfirm={() => { setStarted(true); setShowStart(false); }} onCancel={() => navigate(-1)} busy={busy} />}
      {showSubmit && <PostTestConfirm title="Yakin ingin mengumpulkan Post-Test?" onConfirm={submit} onCancel={() => setShowSubmit(false)} busy={busy} confirmLabel="Ya" cancelLabel="Tidak" />}
    </DashboardLayout>
  );
}

export default EmployeePostTest;
