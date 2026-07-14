import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            window.localStorage.removeItem("authToken");
            window.localStorage.removeItem("authUser");
            if (import.meta.env.VITE_REQUIRE_AUTH === "true" && window.location.pathname !== "/login") {
                window.location.assign("/login");
            }
        }
        return Promise.reject(error);
    }
);

api.interceptors.request.use((config) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    } else {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

export default api;
