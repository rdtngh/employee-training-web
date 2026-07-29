import api from "./api";
import { getMaterialProgress } from "./materialService";
import { getMockTest, submitMockTest } from "./mockTrainingData";

const DEFAULT_PRE_TEST_ID = import.meta.env.VITE_PRE_TEST_ID || "1";
const DEFAULT_POST_TEST_ID = import.meta.env.VITE_POST_TEST_ID || "2";
const DEFAULT_TRAINING_ID = import.meta.env.VITE_TRAINING_ID || "1";

const unwrap = (response) => response.data?.data ?? response.data;

const normalizeAnswer = (answer) => String(answer ?? "").toUpperCase();

const toFormAnswer = (answer) => String(answer ?? "").toLowerCase();

const mapQuestionFromApi = (item) => ({
  id: item.id,
  testId: item.test_id,
  trainingId: item.test?.training_id,
  testType: item.test?.type,
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
  ...(question.trainingId ? { training_id: question.trainingId } : {}),
  ...(question.testType ? { type: question.testType } : {}),
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

export const getExamByTraining = async ({ trainingId, type }) => {
  const response = await api.get("/questions", {
    params: {
      training_id: trainingId,
      type,
    },
  });
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

export const previewExamImport = async ({ trainingId, type, file }) => {
  const formData = new FormData();
  formData.append("training_id", trainingId);
  formData.append("type", type);
  formData.append("file", file);

  const response = await api.post("/questions/import/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data?.data ?? response.data;
};

export const importExamQuestions = async ({ trainingId, type, questions }) => {
  const response = await api.post("/questions/import", {
    training_id: trainingId,
    type,
    questions,
  });

  return mapQuestions(unwrap(response));
};

export const getData = getAllExam;
export const addItem = createExam;
export const updateItem = updateExam;
export const deleteItem = deleteExam;

const getTrainingTest = async (type, fallbackTestId, trainingId = DEFAULT_TRAINING_ID) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const mockTest = getMockTest(type, trainingId);
    if (mockTest) return mockTest;
  }

  try {
    const response = await api.get(`/trainings/${trainingId}/tests/${type}`);
    return unwrap(response);
  } catch (error) {
    if (error.response?.status === 404) {
      const fallback = await api.get(`/tests/${fallbackTestId}`);
      return unwrap(fallback);
    }

    throw error;
  }
};

const getTrainingTestWithQuestions = async (type, fallbackTestId, trainingId = DEFAULT_TRAINING_ID) => {
  const test = mapTest(await getTrainingTest(type, fallbackTestId, trainingId));

  if (test.result) {
    return {
      test,
      result: test.result,
      questions: [],
    };
  }

  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return {
      test,
      questions: mapQuestions(test.questions).map(hideCorrectAnswer),
    };
  }

  const questionsResponse = await api.get(`/tests/${test.id}/questions`);

  return {
    test,
    questions: mapQuestions(unwrap(questionsResponse)).map(hideCorrectAnswer),
  };
};

const submitTest = async (testId, payload) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return submitMockTest(testId, payload?.answers);
  }

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

const mapPostTestResult = (result = {}) => ({
  ...result,
  status: result.passed ? "PASSED" : "FAILED",
  correct: result.correct ?? result.correct_answers ?? 0,
  wrong: result.wrong ?? result.wrong_answers ?? 0,
  can_retry: Boolean(result.can_retry),
  certificate_available: Boolean(result.certificate_available ?? result.passed),
});

export const getPreTest = async (trainingId = DEFAULT_TRAINING_ID) =>
  getTrainingTestWithQuestions("pretest", DEFAULT_PRE_TEST_ID, trainingId);

export const submitPreTest = async (payload) =>
  submitTest(payload?.test_id ?? DEFAULT_PRE_TEST_ID, payload);

export const getPostTest = async (trainingId = DEFAULT_TRAINING_ID) => {
  const materialProgress = await getMaterialProgress(trainingId);
  const progressTraining = materialProgress.training ?? {
    id: trainingId,
    title: "Post-Test",
    post_test_unlocked: false,
  };

  if (!progressTraining.post_test_unlocked) {
    return {
      training: progressTraining,
      materials_completed: false,
      post_test: {
        id: DEFAULT_POST_TEST_ID,
        status: "LOCKED",
        attempt: 0,
        max_attempt: 1,
        can_retry: false,
        certificate_available: false,
        passing_grade: 0,
        score: 0,
        correct: 0,
        wrong: 0,
        percentage: 0,
        passed: false,
      },
      questions: [],
    };
  }

  const data = await getTrainingTestWithQuestions("posttest", DEFAULT_POST_TEST_ID, trainingId);
  const training = progressTraining ?? data.test.training ?? {
    id: data.test.training_id,
    title: data.test.training?.title ?? "Post-Test",
  };
  const completedResult = data.result ? mapPostTestResult(data.result) : null;

  return {
    training,
    materials_completed: Boolean(training.post_test_unlocked),
    post_test: completedResult ?? {
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
    questions: completedResult ? [] : data.questions,
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
  const result = await submitTest(
    payload?.test_id ?? payload?.post_test_id ?? DEFAULT_POST_TEST_ID,
    payload
  );

  return mapPostTestResult(result);
};

export const retryPostTest = async (trainingId = DEFAULT_TRAINING_ID) => getPostTest(trainingId);
