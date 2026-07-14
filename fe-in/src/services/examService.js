import { createCrudStorage } from "./crudStorage";

const initialExams = [
  {
    id: 1,
    question: "Apa singkatan dari CPU?",
    options: {
      a: "Central Processing Unit",
      b: "Central Program Unit",
      c: "Central Processor Unit",
      d: "Core Processing Unit",
    },
    correctAnswer: "a",
  },
  {
    id: 2,
    question: "Berapa banyak byte dalam 1 kilobyte?",
    options: {
      a: "100 bytes",
      b: "512 bytes",
      c: "1024 bytes",
      d: "2048 bytes",
    },
    correctAnswer: "c",
  },
  {
    id: 3,
    question: "Apa fungsi utama RAM pada komputer?",
    options: {
      a: "Menyimpan data secara permanen",
      b: "Menyimpan data sementara untuk proses",
      c: "Menampilkan output ke monitor",
      d: "Mengatur kecepatan processor",
    },
    correctAnswer: "b",
  },
];

const dummyPreTest = {
  test: {
    id: 1,
    training_id: 1,
    type: "pre_test",
    passing_grade: 75,
  },
  questions: initialExams.map(({ id, question, options }) => ({
    id,
    question,
    options: { ...options },
  })),
};

const examStorage = createCrudStorage({
  storageKey: "rsabl_exams",
  initialData: initialExams,
});

export const getData = async () => examStorage.getData();

export const saveData = async (data) => examStorage.saveData(data);

export const addItem = async (examData) => examStorage.addItem(examData);

export const updateItem = async (id, examData) =>
  examStorage.updateItem(id, examData);

export const deleteItem = async (id) => examStorage.deleteItem(id);

export const getAllExam = getData;
export const createExam = addItem;
export const updateExam = updateItem;
export const deleteExam = deleteItem;

// Kontrak Employee tidak mengekspos correctAnswer ke client.
export const getPreTest = async () => ({
  test: { ...dummyPreTest.test },
  questions: dummyPreTest.questions.map((question) => ({
    ...question,
    options: { ...question.options },
  })),
});

// Payload: { test_id, answers: [{ question_id, answer }] }.
// Saat endpoint Laravel tersedia, isi fungsi ini cukup diganti dengan:
// api.post("/employee/pre-test/submit", payload).then(({ data }) => data.data ?? data)
export const submitPreTest = async (payload) => {
  const submittedAnswers = new Map(
    (payload?.answers ?? []).map((item) => [String(item.question_id), item.answer])
  );
  const correctAnswers = initialExams.reduce(
    (total, question) =>
      total +
      (submittedAnswers.get(String(question.id)) === question.correctAnswer ? 1 : 0),
    0
  );
  const totalQuestions = initialExams.length;
  const percentage = totalQuestions
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  return {
    score: percentage,
    correct_answers: correctAnswers,
    wrong_answers: totalQuestions - correctAnswers,
    percentage,
    passed: percentage >= dummyPreTest.test.passing_grade,
    passing_grade: dummyPreTest.test.passing_grade,
  };
};

const dummyPostTestQuestions = initialExams.map(({ id, question, options }) => ({
  id: `post-${id}`,
  question,
  options: { ...options },
}));

const dummyPostTest = {
  training: { id: 1, title: "Pelatihan Keselamatan Pasien" },
  materials_completed: false,
  post_test: {
    id: 2,
    status: "NOT_STARTED",
    attempt: 1,
    max_attempt: 2,
    can_retry: false,
    certificate_available: false,
    passing_grade: 75,
    score: 0,
    correct: 0,
    wrong: 0,
    percentage: 0,
    passed: false,
  },
};

const clonePostTestResponse = () => ({
  training: { ...dummyPostTest.training },
  materials_completed: dummyPostTest.materials_completed,
  post_test: { ...dummyPostTest.post_test },
  questions: dummyPostTestQuestions.map((question) => ({
    ...question,
    options: { ...question.options },
  })),
});

export const getPostTest = async () => clonePostTestResponse();

export const getPostTestResult = async () => ({ ...dummyPostTest.post_test });

// Keputusan lulus, retry, attempt, dan sertifikat di bawah ini mensimulasikan backend.
export const submitPostTest = async (payload) => {
  const submittedAnswers = new Map(
    (payload?.answers ?? []).map((item) => [String(item.question_id), item.answer])
  );
  const correct = initialExams.reduce(
    (total, question) =>
      total +
      (submittedAnswers.get(`post-${question.id}`) === question.correctAnswer ? 1 : 0),
    0
  );
  const percentage = Math.round((correct / initialExams.length) * 100);
  const passed = percentage >= dummyPostTest.post_test.passing_grade;

  dummyPostTest.post_test = {
    ...dummyPostTest.post_test,
    status: passed ? "PASSED" : "FAILED",
    score: percentage,
    correct,
    wrong: initialExams.length - correct,
    percentage,
    passed,
    can_retry: !passed && dummyPostTest.post_test.attempt < dummyPostTest.post_test.max_attempt,
    certificate_available: passed,
  };

  return { ...dummyPostTest.post_test };
};

export const retryPostTest = async () => {
  if (!dummyPostTest.post_test.can_retry) return { ...dummyPostTest.post_test };

  dummyPostTest.post_test = {
    ...dummyPostTest.post_test,
    status: "NOT_STARTED",
    attempt: dummyPostTest.post_test.attempt + 1,
    can_retry: false,
    score: 0,
    correct: 0,
    wrong: 0,
    percentage: 0,
    passed: false,
    certificate_available: false,
  };
  return clonePostTestResponse();
};
