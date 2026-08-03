import api from "./api";
import { mockTrainings } from "./mockTrainingData";

let mockTrainingStore = mockTrainings.map((training) => ({ ...training }));

const normalizeTraining = (training) => ({
  id: training.id,
  title: training.title ?? training.name ?? `Pelatihan ${training.id}`,
  ...training,
});

export const getTrainings = async () => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return mockTrainingStore.map(normalizeTraining);
  }

  const response = await api.get("/trainings");
  return (response.data?.data ?? []).map(normalizeTraining);
};

export const getTraining = async (id) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    return mockTrainingStore.map(normalizeTraining).find((training) => String(training.id) === String(id)) ?? null;
  }

  const response = await api.get(`/trainings/${id}`);
  const training = response.data?.data ?? null;
  return training ? normalizeTraining(training) : null;
};

export const createTraining = async (trainingData) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const nextId = Math.max(0, ...mockTrainingStore.map((training) => Number(training.id) || 0)) + 1;
    const training = normalizeTraining({
      id: nextId,
      title: trainingData.title,
      is_active: true,
    });

    mockTrainingStore = [...mockTrainingStore, training];
    return training;
  }

  const response = await api.post("/trainings", {
    title: trainingData.title,
  });
  const training = response.data?.data ?? response.data;

  return normalizeTraining(training);
};

export const updateTraining = async (id, trainingData) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    const updatedTraining = normalizeTraining({
      id,
      title: trainingData.title,
      is_active: true,
    });

    mockTrainingStore = mockTrainingStore.map((training) =>
      String(training.id) === String(id) ? { ...training, ...updatedTraining } : training
    );
    return updatedTraining;
  }

  const response = await api.put(`/trainings/${id}`, {
    title: trainingData.title,
  });
  const training = response.data?.data ?? response.data;

  return normalizeTraining(training);
};

export const deleteTraining = async (id) => {
  if (import.meta.env.VITE_USE_DUMMY_DATA === "true") {
    mockTrainingStore = mockTrainingStore.filter((training) => String(training.id) !== String(id));
    return true;
  }

  await api.delete(`/trainings/${id}`);
  return true;
};

export const uploadCertificateTemplate = async (trainingId, file) => {
  const formData = new FormData();
  formData.append("template", file, file.name);

  const response = await api.post(`/trainings/${trainingId}/certificate-template`, formData);
  const training = response.data?.data ?? response.data;

  return normalizeTraining(training);
};

export const deleteCertificateTemplate = async (trainingId) => {
  const response = await api.delete(`/trainings/${trainingId}/certificate-template`);
  const training = response.data?.data ?? response.data;

  return normalizeTraining(training);
};

export const updateCertificateTemplateSettings = async (trainingId, settings) => {
  const response = await api.put(
    `/trainings/${trainingId}/certificate-template/settings`,
    settings
  );
  const training = response.data?.data ?? response.data;

  return normalizeTraining(training);
};
