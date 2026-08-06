import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ExamConfirmDialog from "../../components/exam/ExamConfirmDialog";
import ExamResultCard from "../../components/exam/ExamResultCard";
import TrainingSelectionCard from "../../components/employee/TrainingSelectionCard";
import { useSessionAnswers } from "../../hooks/useSessionAnswers";
import * as examService from "../../services/examService";
import * as trainingService from "../../services/trainingService";
import eyeOpenIcon from "../../assets/icons/icon-matabuka.svg";
import eyeClosedIcon from "../../assets/icons/icon-matatutup.svg";
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

const isPassedResult = (testResult) =>
  Boolean(testResult?.passed ?? testResult?.status === "PASSED");

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
  const [startedAt, setStartedAt] = useState(null);
  const [startedMs, setStartedMs] = useState(null);
  const [showStart, setShowStart] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showFailureNotice, setShowFailureNotice] = useState(false);
  const [loading, setLoading] = useState(Boolean(trainingId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);

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
      setStartedAt(null);
      setStartedMs(null);
      setShowStart(false);
      setShowSubmit(false);
      setShowFailureNotice(false);
      setAccessCode("");
      setAccessCodeError("");
      setShowAccessCode(false);
      examService.getPostTest(trainingId)
        .then((rawResponse) => {
          if (!active) return;
          const response = unwrap(rawResponse);
          setData(response);
          if (["PASSED", "FAILED"].includes(response.post_test?.status)) {
            setResult(response.post_test);
            setShowFailureNotice(!isPassedResult(response.post_test));
          } else if (response.post_test_access_required && !response.post_test_access_verified) {
            setShowStart(false);
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
  const resultPassed = isPassedResult(result);
  const canRetry = !resultPassed;
  const needsAccessCode = Boolean(
    data?.materials_completed &&
    data?.post_test_access_required &&
    !data?.post_test_access_verified
  );

  const verifyAccessCode = async (event) => {
    event.preventDefault();

    const trimmedCode = accessCode.trim();
    if (!trimmedCode) {
      setAccessCodeError("Kode akses wajib diisi.");
      return;
    }

    setBusy(true);
    setAccessCodeError("");
    setError("");

    try {
      await examService.verifyPostTestAccessCode(trainingId, trimmedCode);
      const response = unwrap(await examService.getPostTest(trainingId));
      setData(response);
      setAccessCode("");

      if (["PASSED", "FAILED"].includes(response.post_test?.status)) {
        setResult(response.post_test);
        setShowFailureNotice(!isPassedResult(response.post_test));
      } else if (response.materials_completed) {
        setShowStart(true);
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        "Kode akses tidak dapat diverifikasi.";
      setAccessCodeError(message);
    } finally {
      setBusy(false);
    }
  };

  const startExam = async () => {
    if (!data?.post_test?.id) return;

    setBusy(true);
    setError("");

    try {
      const startData = await examService.startTest(data.post_test.id);
      setStartedAt(startData.started_at ?? new Date().toISOString());
    } catch {
      setStartedAt(new Date().toISOString());
    } finally {
      setStartedMs(performance.now());
      setStarted(true);
      setShowStart(false);
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const response = unwrap(await examService.submitPostTest({
        post_test_id: data.post_test.id,
        training_id: data.training.id,
        answers: questions.map((item) => ({ question_id: item.id, answer: answers[item.id] })),
        started_at: startedAt,
        elapsed_seconds: startedMs === null ? undefined : Math.max(1, Math.round((performance.now() - startedMs) / 1000)),
      }));
      setResult(response);
      setShowFailureNotice(!isPassedResult(response));
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
      setError("");
      const response = unwrap(await examService.retryPostTest(data.training.id));
      setData(response);
      setResult(null);
      setShowFailureNotice(false);
      clearAnswers();
      setCurrentIndex(0);
      setStarted(false);
      setStartedAt(null);
      setStartedMs(null);
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
            {canRetry && (
              <button type="button" className="posttest-retry" onClick={retry} disabled={busy}>Ulangi Lagi</button>
            )}
          </ExamResultCard>
        )}

        {trainingId && !loading && !result && needsAccessCode && (
          <form className="posttest-access-card" onSubmit={verifyAccessCode}>
            <h1>Kode Akses Post-Test</h1>
            <p>Masukkan kode yang diberikan oleh admin atau instruktur pelatihan.</p>
            <label htmlFor="posttest-access-code">Kode akses</label>
            <div className="posttest-access-input-row">
              <input
                id="posttest-access-code"
                type={showAccessCode ? "text" : "password"}
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  setAccessCodeError("");
                }}
                disabled={busy}
                autoFocus
              />
              <button
                type="button"
                className="posttest-access-toggle"
                onClick={() => setShowAccessCode((visible) => !visible)}
                disabled={busy}
                aria-label={showAccessCode ? "Sembunyikan kode akses" : "Tampilkan kode akses"}
              >
                <img src={showAccessCode ? eyeOpenIcon : eyeClosedIcon} alt="" />
              </button>
            </div>
            {accessCodeError && (
              <span className="posttest-access-error" role="alert">
                {accessCodeError}
              </span>
            )}
            <button type="submit" disabled={busy}>
              {busy ? "Memeriksa..." : "Buka Post-Test"}
            </button>
          </form>
        )}

        {trainingId && !loading && !result && !needsAccessCode && question && (
          <div className={`pretest-exam${started ? "" : " is-blocked"}`}>
            <article className="pretest-question-card">
              <p className="pretest-question-number">Q{currentIndex + 1} / {questions.length}</p>
              <h1>{question.question}</h1>
              {question.imageUrl && (
                <img className="employee-question-image" src={question.imageUrl} alt="Ilustrasi soal" />
              )}
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

        {trainingId && !loading && !result && !question && data?.materials_completed && !needsAccessCode && !error && (
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
      {showStart && <ExamConfirmDialog title="Yakin ingin mengerjakan Post-Test sekarang?" onConfirm={startExam} onCancel={() => navigate(-1)} busy={busy} />}
      {showSubmit && <ExamConfirmDialog title="Yakin ingin mengumpulkan Post-Test?" onConfirm={submit} onCancel={() => setShowSubmit(false)} busy={busy} />}
      {showFailureNotice && result && !resultPassed && (
        <div className="posttest-failure-overlay" role="presentation">
          <section
            className="posttest-failure-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="posttest-failure-title"
            aria-describedby="posttest-failure-description"
          >
            <h2 id="posttest-failure-title">Post-Test Belum Lulus</h2>
            <p id="posttest-failure-description">
              Anda harus lulus Post-Test untuk mendapatkan sertifikat.
            </p>
            <div className="posttest-failure-actions">
              <button type="button" onClick={() => setShowFailureNotice(false)} disabled={busy}>
                Mengerti
              </button>
              <button type="button" className="posttest-failure-retry" onClick={retry} disabled={busy}>
                Ulangi Lagi
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default EmployeePostTest;
