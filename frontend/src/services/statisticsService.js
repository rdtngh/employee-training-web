import api from "./api";
import { getMockStatistics } from "./mockTrainingData";

const unwrap = (response) => response.data?.data ?? response.data;

export const getStatistics = async (options = {}) => {
  const role = typeof options === "string" ? options : options.role;
  const trainingId = typeof options === "object" ? options.trainingId : undefined;

  if (import.meta.env.VITE_USE_DUMMY_DATA === "true" && trainingId) {
    return {
      ...getMockStatistics(trainingId),
      role,
    };
  }

  const response = await api.get("/statistics", {
    params: trainingId ? { training_id: trainingId } : undefined,
  });

  return {
    ...unwrap(response),
    role,
  };
};

export const resetStatistics = async () => {
  const response = await api.post("/statistics/reset");
  return unwrap(response);
};

const filenameFromDisposition = (disposition) => {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1];
};

export const exportStatistics = async (format = "xlsx") => {
  let response;

  try {
    response = await api.get("/statistics/export", {
      params: { format },
      responseType: "blob",
    });
  } catch (error) {
    const data = error.response?.data;

    if (data instanceof Blob && data.type.includes("application/json")) {
      error.response.data = JSON.parse(await data.text());
    }

    throw error;
  }

  return {
    blob: response.data,
    filename:
      filenameFromDisposition(response.headers["content-disposition"]) ||
      `statistik-${format}.xlsx`,
  };
};
