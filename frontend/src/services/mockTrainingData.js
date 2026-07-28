export const mockTrainings = [
  { id: 1, title: "Pelatihan A" },
  { id: 2, title: "Pelatihan B" },
  { id: 3, title: "Pelatihan C" },
];

export const mockMaterials = [
  { id: 1, training_id: 1, title: "Materi A1", files: [], completed: false },
  { id: 2, training_id: 1, title: "Materi A2", files: [], completed: false },
  { id: 3, training_id: 2, title: "Materi B1", files: [], completed: false },
  { id: 4, training_id: 3, title: "Materi C1", files: [], completed: false },
];

const createQuestions = (testId, label) => [
  {
    id: testId * 10 + 1,
    test_id: testId,
    question: `Apa tujuan utama ${label}?`,
    option_a: "Memahami materi pelatihan",
    option_b: "Mengabaikan prosedur",
    option_c: "Mengurangi koordinasi",
    option_d: "Menunda pekerjaan",
    correct_answer: "A",
    order_number: 1,
  },
  {
    id: testId * 10 + 2,
    test_id: testId,
    question: `Apa langkah penting setelah mengikuti ${label}?`,
    option_a: "Tidak mencatat hasil",
    option_b: "Menerapkan prosedur sesuai panduan",
    option_c: "Melewati evaluasi",
    option_d: "Menghapus dokumen",
    correct_answer: "B",
    order_number: 2,
  },
];

export const mockTests = [
  {
    id: 101,
    training_id: 1,
    type: "pretest",
    title: "Pre-Test Pelatihan A",
    passing_grade: 70,
    questions: createQuestions(101, "Pelatihan A"),
  },
  {
    id: 102,
    training_id: 1,
    type: "posttest",
    title: "Post-Test Pelatihan A",
    passing_grade: 70,
    questions: createQuestions(102, "Pelatihan A"),
  },
  {
    id: 201,
    training_id: 2,
    type: "pretest",
    title: "Pre-Test Pelatihan B",
    passing_grade: 70,
    questions: createQuestions(201, "Pelatihan B"),
  },
  {
    id: 202,
    training_id: 2,
    type: "posttest",
    title: "Post-Test Pelatihan B",
    passing_grade: 70,
    questions: createQuestions(202, "Pelatihan B"),
  },
  {
    id: 301,
    training_id: 3,
    type: "pretest",
    title: "Pre-Test Pelatihan C",
    passing_grade: 70,
    questions: createQuestions(301, "Pelatihan C"),
  },
  {
    id: 302,
    training_id: 3,
    type: "posttest",
    title: "Post-Test Pelatihan C",
    passing_grade: 70,
    questions: createQuestions(302, "Pelatihan C"),
  },
];

export const getMockTest = (type, trainingId) => {
  const test = mockTests.find(
    (item) => item.type === type && String(item.training_id) === String(trainingId)
  );
  const training = mockTrainings.find((item) => String(item.id) === String(trainingId));

  if (!test) return null;

  return {
    ...test,
    training,
    questions: test.questions.map((question) => ({ ...question })),
  };
};

export const submitMockTest = (testId, answers = []) => {
  const test = mockTests.find((item) => String(item.id) === String(testId));
  const questions = test?.questions ?? [];
  const correct = answers.filter((answer) => {
    const question = questions.find((item) => String(item.id) === String(answer.question_id));
    return String(answer.selected_answer ?? answer.answer ?? "").toUpperCase() === question?.correct_answer;
  }).length;
  const wrong = Math.max(questions.length - correct, 0);
  const percentage = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const passed = percentage >= (test?.passing_grade ?? 70);

  return {
    test_id: test?.id ?? testId,
    training_id: test?.training_id,
    score: percentage,
    percentage,
    correct,
    wrong,
    passing_grade: test?.passing_grade ?? 70,
    passed,
    status: passed ? "PASSED" : "FAILED",
    can_retry: !passed,
    certificate_available: passed,
  };
};

const createRanges = (values) =>
  ["1-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100"].map(
    (label, index) => ({
      label,
      count: values[index] ?? 0,
      percentage: values[index] ?? 0,
    })
  );

export const getMockStatistics = (trainingId) => {
  const training = mockTrainings.find((item) => String(item.id) === String(trainingId)) ?? mockTrainings[0];
  const valuesByTraining = {
    1: [10, 20, 25, 40, 50, 60, 75, 90, 100],
    2: [8, 15, 20, 30, 45, 55, 65, 70, 82],
    3: [5, 10, 18, 26, 38, 50, 62, 76, 88],
  };
  const values = valuesByTraining[training.id] ?? valuesByTraining[1];

  return {
    title: "Statistik",
    training,
    training_id: training.id,
    training_title: training.title,
    participant_count: 10,
    score_distributions: {
      pretest: {
        label: "Pre Test",
        participant_count: 10,
        ranges: createRanges(values),
      },
      posttest: {
        label: "Post Test",
        participant_count: 10,
        ranges: createRanges(values.slice().reverse()),
      },
    },
  };
};
