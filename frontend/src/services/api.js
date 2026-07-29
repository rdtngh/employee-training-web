import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
    withCredentials: true,
});

const getLoginPath = () => {
    const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
    return `${basePath.replace(/\/$/, "")}/login`;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            window.localStorage.removeItem("authToken");
            window.localStorage.removeItem("authUser");
            delete api.defaults.headers.common.Authorization;
            const loginPath = getLoginPath();
            if (window.location.pathname !== loginPath) {
                window.location.assign(loginPath);
            }
        }
        return Promise.reject(error);
    }
);

api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    } else {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

export default api;
