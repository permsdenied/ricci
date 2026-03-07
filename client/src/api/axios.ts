import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если 401 пришёл НЕ от логина — значит токен протух, выкидываем
    // Если 401 от логина — просто пробрасываем ошибку в catch
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes("/auth/login");

      if (!isLoginRequest) {
        // Токен протух на защищённом маршруте — разлогиниваем
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        window.location.href = "/login";
      }
      // Для логина — НЕ редиректим, пусть catch в LoginPage обработает
    }

    return Promise.reject(error);
  },
);

export default api;
