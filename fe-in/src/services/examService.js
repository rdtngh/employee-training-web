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
    passing_grade: 70,
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
