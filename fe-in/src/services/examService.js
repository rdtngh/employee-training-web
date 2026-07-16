import api from "./api";

const DEFAULT_PRE_TEST_ID = import.meta.env.VITE_PRE_TEST_ID || "1";
const DEFAULT_POST_TEST_ID = import.meta.env.VITE_POST_TEST_ID || "2";

const unwrap = (response) => response.data?.data ?? response.data;

const normalizeAnswer = (answer) => String(answer ?? "").toUpperCase();

const toFormAnswer = (answer) => String(answer ?? "").toLowerCase();

const mapQuestionFromApi = (item) => ({
  id: item.id,
  testId: item.test_id,
  question: item.question,
  options: {
    a: item.option_a,
    b: item.option_b,
    c: item.option_c,
    d: item.option_d,
  },
  correctAnswer: item.correct_answer ? toFormAnswer(item.correct_answer) : undefined,
  orderNumber: item.order_number,
});

const mapQuestionToApi = (question) => ({
  question: question.question,
  option_a: question.options.a,
  option_b: question.options.b,
  option_c: question.options.c,
  option_d: question.options.d,
  correct_answer: normalizeAnswer(question.correctAnswer),
});

const mapQuestions = (questions = []) => questions.map(mapQuestionFromApi);

const hideCorrectAnswer = (question) => {
  const safeQuestion = { ...question };
  delete safeQuestion.correctAnswer;
  return safeQuestion;
};

const mapTest = (test) => ({
  ...test,
  passing_grade: test?.passing_grade ?? test?.passing_score,
});

export const getAllExam = async () => {
  const response = await api.get("/questions");
  return mapQuestions(unwrap(response));
};

export const createExam = async (examData) => {
  const response = await api.post("/questions", mapQuestionToApi(examData));
  return mapQuestionFromApi(unwrap(response));
};

export const updateExam = async (id, examData) => {
  const response = await api.put(`/questions/${id}`, mapQuestionToApi(examData));
  return mapQuestionFromApi(unwrap(response));
};

export const deleteExam = async (id) => {
  await api.delete(`/questions/${id}`);
};

export const getData = getAllExam;
export const addItem = createExam;
export const updateItem = updateExam;
export const deleteItem = deleteExam;

const getTestWithQuestions = async (testId) => {
  const [testResponse, questionsResponse] = await Promise.all([
    api.get(`/tests/${testId}`),
    api.get(`/tests/${testId}/questions`),
  ]);

  return {
    test: mapTest(unwrap(testResponse)),
    questions: mapQuestions(unwrap(questionsResponse)).map(hideCorrectAnswer),
  };
};

const submitTest = async (testId, payload) => {
  const response = await api.post(`/tests/${testId}/submit`, {
    answers: (payload?.answers ?? []).map((answer) => ({
      question_id: answer.question_id,
      selected_answer: normalizeAnswer(answer.selected_answer ?? answer.answer),
    })),
  });

  const result = unwrap(response);
  const score = result.score ?? result.percentage ?? 0;
  const passingGrade = result.passing_grade ?? payload?.passing_grade;
  const passed =
    typeof result.passed === "boolean"
      ? result.passed
      : String(result.status ?? "").toLowerCase() === "lulus";

  return {
    ...result,
    score,
    percentage: result.percentage ?? score,
    passed,
    passing_grade: passingGrade,
  };
};

export const getPreTest = async () => getTestWithQuestions(DEFAULT_PRE_TEST_ID);

export const submitPreTest = async (payload) =>
  submitTest(payload?.test_id ?? DEFAULT_PRE_TEST_ID, payload);

export const getPostTest = async () => {
  const data = await getTestWithQuestions(DEFAULT_POST_TEST_ID);

  return {
    training: data.test.training ?? {
      id: data.test.training_id,
      title: data.test.training?.title ?? "Post-Test",
    },
    materials_completed: true,
    post_test: {
      id: data.test.id,
      status: "NOT_STARTED",
      attempt: 1,
      max_attempt: 1,
      can_retry: false,
      certificate_available: false,
      passing_grade: data.test.passing_grade,
      score: 0,
      correct: 0,
      wrong: 0,
      percentage: 0,
      passed: false,
    },
    questions: data.questions,
  };
};

export const getPostTestResult = async () => ({
  status: "NOT_STARTED",
  attempt: 1,
  max_attempt: 1,
  can_retry: false,
  certificate_available: false,
  score: 0,
  correct: 0,
  wrong: 0,
  percentage: 0,
  passed: false,
});

export const submitPostTest = async (payload) => {
  const result = await submitTest(payload?.test_id ?? DEFAULT_POST_TEST_ID, payload);

  return {
    ...result,
    status: result.passed ? "PASSED" : "FAILED",
    correct: result.correct ?? result.correct_answers ?? 0,
    wrong: result.wrong ?? result.wrong_answers ?? 0,
    can_retry: Boolean(result.can_retry),
    certificate_available: Boolean(result.certificate_available ?? result.passed),
  };
};

export const retryPostTest = async () => getPostTest();
