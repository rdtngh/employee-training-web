import api from "./api";

export const getEmployeeHistory = async () => {
  const response = await api.get("/training-history");
  return response.data?.data ?? response.data;
};

export const getAdminHistories = async () => {
  const response = await api.get("/training-histories");
  return response.data?.data ?? response.data;
};

export const deleteHistory = async (trainingId, userId) => {
  const response = await api.delete(`/training-histories/${trainingId}/users/${userId}`);
  return response.data;
};
