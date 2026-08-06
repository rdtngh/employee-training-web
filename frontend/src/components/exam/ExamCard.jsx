import "./ExamCard.css";

function ExamCard({ question, index, onEdit, onDelete }) {
  const options = [
    { key: "a", label: "Option A", value: question.options.a },
    { key: "b", label: "Option B", value: question.options.b },
    { key: "c", label: "Option C", value: question.options.c },
    { key: "d", label: "Option D", value: question.options.d },
  ];

  return (
    <div className="exam-card">
      <div className="exam-card-header">
        <span className="exam-card-number">Q{index + 1}</span>
        <div className="exam-card-actions">
          <button
            type="button"
            className="exam-card-btn exam-card-btn-delete"
            onClick={() => onDelete(question.id)}
            title="Hapus soal"
          >
            Hapus
          </button>
          <button
            type="button"
            className="exam-card-btn exam-card-btn-edit"
            onClick={() => onEdit(question)}
            title="Edit soal"
          >
            Edit
          </button>
        </div>
      </div>

      <p className="exam-card-question">{question.question}</p>
      {question.imageUrl && (
        <img className="exam-card-image" src={question.imageUrl} alt="Ilustrasi soal" />
      )}

      <div className="exam-card-options">
        {options.map((option) => (
          <div key={option.key} className="exam-card-option">
            <span
              className={`exam-card-radio ${
                question.correctAnswer === option.key ? "active" : ""
              }`}
              aria-hidden="true"
            />
            <span className="exam-card-option-text">{option.value}</span>
            {question.correctAnswer === option.key && (
              <span className="exam-card-correct-label">Jawaban benar</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExamCard;
