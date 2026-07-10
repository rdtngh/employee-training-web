import { useEffect, useRef, useState } from "react";
import "./ExamForm.css";
import addQuestionIcon from "../../assets/icons/icon-tambahsoal.svg";

function ExamForm({
  mode = "add",
  selectedQuestion,
  onSubmit,
  onCancel,
  errors = {},
  loading = false,
  resetSignal = 0,
}) {
  const questionInputRef = useRef(null);

  const [form, setForm] = useState({
    question: "",
    options: {
      a: "",
      b: "",
      c: "",
      d: "",
    },
    correctAnswer: "",
  });

  const isEditMode = mode === "edit";

  const resetFormData = () => {
    setForm({
      question: "",
      options: {
        a: "",
        b: "",
        c: "",
        d: "",
      },
      correctAnswer: "",
    });
  };

  useEffect(() => {
    if (isEditMode && selectedQuestion) {
      setForm({
        question: selectedQuestion.question,
        options: { ...selectedQuestion.options },
        correctAnswer: selectedQuestion.correctAnswer,
      });
    } else {
      resetFormData();
    }
  }, [selectedQuestion, isEditMode]);

  useEffect(() => {
    if (!isEditMode && resetSignal !== 0) {
      resetFormData();
      questionInputRef.current?.focus();
    }
  }, [resetSignal, isEditMode]);

  const handleQuestionChange = (e) => {
    setForm((prev) => ({
      ...prev,
      question: e.target.value,
    }));
  };

  const handleOptionChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value,
      },
    }));
  };

  const handleCorrectAnswerChange = (e) => {
    setForm((prev) => ({
      ...prev,
      correctAnswer: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  const questionId = isEditMode ? selectedQuestion?.id : null;
  onSubmit(form, questionId);
};

  const handleCancel = () => {
  resetFormData();
  onCancel();
};

  const pageTitle = isEditMode ? "Edit Soal" : "Tambah Soal";

const buttonText = isEditMode
  ? loading
    ? "Menyimpan..."
    : "Simpan Perubahan"
  : loading
    ? "Memproses..."
    : "Tambah Soal";

return (
    <>
      <div className="exam-form-container">
        <div className="exam-form-header">
          <img
            src={addQuestionIcon}
            alt="Tambah Soal"
            className="exam-form-icon"
          />
          <h2 className="exam-form-title">{pageTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="exam-form">

          <div className="exam-form-group">
            <label htmlFor="question" className="exam-form-label">
              Masukkan Soal
            </label>

            <textarea
              id="question"
              ref={questionInputRef}
              rows={3}
              placeholder="Ketik soal di sini..."
              className={`exam-form-input exam-form-textarea ${
                errors.question ? "error" : ""
              }`}
              value={form.question}
              onChange={handleQuestionChange}
              disabled={loading}
            />

            {errors.question && (
              <span className="exam-form-error">
                {errors.question}
              </span>
            )}
          </div>

          {["a", "b", "c", "d"].map((key, index) => (
            <div key={key} className="exam-form-group">
              <label
                htmlFor={`option-${key}`}
                className="exam-form-label"
              >
                Masukkan Option {String.fromCharCode(65 + index)}
              </label>

              <input
                id={`option-${key}`}
                type="text"
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                className={`exam-form-input ${
                  errors[`option${String.fromCharCode(65 + index)}`]
                    ? "error"
                    : ""
                }`}
                value={form.options[key]}
                onChange={(e) =>
                  handleOptionChange(key, e.target.value)
                }
                disabled={loading}
              />

              {errors[`option${String.fromCharCode(65 + index)}`] && (
                <span className="exam-form-error">
                  {errors[`option${String.fromCharCode(65 + index)}`]}
                </span>
              )}
            </div>
          ))}

          <div className="exam-form-group">
            <label
              htmlFor="correctAnswer"
              className="exam-form-label"
            >
              Jawaban Benar
            </label>

            <select
              id="correctAnswer"
              className={`exam-form-select ${
                errors.correctAnswer ? "error" : ""
              }`}
              value={form.correctAnswer}
              onChange={handleCorrectAnswerChange}
              disabled={loading}
            >
              <option value="">
                Pilih jawaban yang benar
              </option>

              <option value="a">Option A</option>
              <option value="b">Option B</option>
              <option value="c">Option C</option>
              <option value="d">Option D</option>
            </select>

            {errors.correctAnswer && (
              <span className="exam-form-error">
                {errors.correctAnswer}
              </span>
            )}
          </div>

          <div className="exam-form-actions">

            {isEditMode && (
              <button
                type="button"
                className="exam-form-btn exam-form-btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              className="exam-form-btn exam-form-btn-submit"
              disabled={loading}
            >
              {buttonText}
            </button>

          </div>
        </form>
      </div>
    </>
  );
}

export default ExamForm;