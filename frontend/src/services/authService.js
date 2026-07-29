import api from "./api";
import axios from "axios";
import { normalizeRole } from "../utils/role";

export { normalizeRole };

export const clearSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  delete api.defaults.headers.common.Authorization;
};

const getCsrfCookieUrl = () => {
  const apiBaseUrl = api.defaults.baseURL || window.location.origin;
  return new URL("/sanctum/csrf-cookie", apiBaseUrl).toString();
};

export const login = async ({ employeeNumber, password }) => {
  clearSession();

  await axios.get(getCsrfCookieUrl(), {
    withCredentials: true,
  });

  const response = await api.post("/login", {
    employee_number: employeeNumber,
    password,
  });

  return response.data;
};

export const storeSession = ({ user }) => {
  localStorage.setItem("authUser", JSON.stringify(user));
};

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
    clearSession();
  }
};

export const getCurrentUser = async () => {
  const response = await api.get("/me");
  const user = response.data?.user ?? response.data?.data ?? null;

  if (user) {
    storeSession({ user });
  }

  return user;
};
