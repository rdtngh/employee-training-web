import api from "./api";

export const getTrainings = async () => {
  const response = await api.get("/trainings");
  return response.data?.data ?? [];
};

export const getTraining = async (id) => {
  const response = await api.get(`/trainings/${id}`);
  return response.data?.data ?? null;
};
