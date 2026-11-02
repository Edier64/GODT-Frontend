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

api.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    localStorage.removeItem("godt.jwtToken");
    window.dispatchEvent(new CustomEvent("godt:session-expired"));
  }
  return Promise.reject(error);
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "No fue posible conectarse con el backend.";
    if (error.response.status === 401) return "La sesión no es válida o ha expirado.";
    if (error.response.status === 403) return "No tienes permisos para esta operación.";
    if (error.response.status === 404) return "El recurso solicitado no existe.";
    if (error.response.status === 409) return "La operación entra en conflicto con un cambio existente.";
    if (error.response.status === 422) return "Los datos enviados no cumplen las validaciones del backend.";
    const message = typeof error.response.data === "string"
      ? error.response.data
      : error.response.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return "No fue posible completar la operación.";
}
