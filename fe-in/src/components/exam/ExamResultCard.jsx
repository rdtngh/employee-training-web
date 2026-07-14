import passedIcon from "../../assets/icons/icon-lulus.svg";
import failedIcon from "../../assets/icons/icon-tidaklulus.svg";

function ExamResultCard({ result, className = "", children }) {
  const passed = result?.passed ?? result?.status === "PASSED";
  return (
    <div className={`pretest-result ${className} ${passed ? "passed" : "failed"}`.trim()}>
      <img src={passed ? passedIcon : failedIcon} alt="" />
      <h1>{passed ? "LULUS" : "TIDAK LULUS"}</h1>
      <dl>
        <div><dt>Skor</dt><dd>{result.score}</dd></div>
        <div><dt>Benar</dt><dd>{result.correct ?? result.correct_answers}</dd></div>
        <div><dt>Salah</dt><dd>{result.wrong ?? result.wrong_answers}</dd></div>
        <div><dt>Persentase</dt><dd>{result.percentage}%</dd></div>
      </dl>
      {children}
    </div>
  );
}

export default ExamResultCard;
