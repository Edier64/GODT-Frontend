import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("godt.jwtToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
    if (error.response?.status === 401) return "La sesión no es válida.";
    if (error.response?.status === 403) return "No tienes permisos para esta operación.";
  }
  return "No fue posible completar la operación.";
}
