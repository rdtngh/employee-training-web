import api from "./api";
import { normalizeRole } from "../utils/role";

export { normalizeRole };

export const login = async ({ employeeNumber, password }) => {
  const response = await api.post("/login", {
    employee_number: employeeNumber,
    password,
  });

  return response.data;
};

export const storeSession = ({ token, user }) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUser", JSON.stringify(user));
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const getStoredToken = () => localStorage.getItem("authToken");

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser"));
  } catch {
    return null;
  }
};


export const logout = async () => {
  try {
    await api.post("/logout");
  } finally {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    delete api.defaults.headers.common.Authorization;
  }
};

export const getCurrentUser = async () => {
  const response = await api.get("/me");
  return response.data?.user ?? response.data?.data ?? null;
};
