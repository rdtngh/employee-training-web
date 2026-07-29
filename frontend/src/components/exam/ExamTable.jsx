import "./ExamTable.css";
import ExamCard from "./ExamCard";

function ExamTable({ questions, onEdit, onDelete, emptyMessage = "Belum ada soal. Mulai dengan menambahkan soal baru." }) {
  if (questions.length === 0) {
    return (
      <div className="exam-table-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="exam-table">
      {questions.map((question, index) => (
        <ExamCard
          key={question.id}
          question={question}
          index={index}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ExamTable;
