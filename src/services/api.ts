import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  notifySessionExpired,
  requestSingleFlightRefresh,
} from "./authSessionBridge";

interface RetriableAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const AUTH_NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

function isAuthLifecycleUrl(url?: string): boolean {
  if (!url) return false;
  return AUTH_NO_REFRESH_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    return Promise.reject(error);
  }

  const originalRequest = error.config as RetriableAxiosConfig;

  if (isAuthLifecycleUrl(originalRequest.url)) {
    return Promise.reject(error);
  }

  if (originalRequest._retry) {
    notifySessionExpired();
    return Promise.reject(error);
  }

  originalRequest._retry = true;

  try {
    const newAccessToken = await requestSingleFlightRefresh();
    if (!newAccessToken) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  } catch {
    notifySessionExpired();
    return Promise.reject(error);
  }
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === "ECONNABORTED") return "Tiempo de espera agotado al conectar con el servidor.";
      return "No fue posible conectarse con el backend (Servicio no disponible o error de red).";
    }

    const data = error.response.data;
    let customMessage: string | null = null;
    if (typeof data === "string" && data.trim()) {
      customMessage = data.trim();
    } else if (data && typeof data === "object") {
      const msg = (data as any).message || (data as any).error;
      if (typeof msg === "string" && msg.trim()) {
        customMessage = msg.trim();
      } else if (Array.isArray(msg) && msg.length > 0) {
        customMessage = msg.join(", ");
      }
    }

    if (customMessage) {
      return customMessage;
    }

    switch (error.response.status) {
      case 400:
        return "Solicitud inválida o malformada. Verifique los datos ingresados.";
      case 401:
        return "La sesión no es válida o ha expirado. Inicie sesión nuevamente.";
      case 403:
        return "Acceso denegado: No tiene permisos suficientes para realizar esta operación.";
      case 404:
        return "El recurso solicitado no fue encontrado en el sistema.";
      case 409:
        return "Conflicto operativo: La operación entra en conflicto con el estado actual del recurso.";
      case 422:
        return "Los datos enviados no cumplen las reglas de negocio o validaciones clínicas.";
      case 429:
        return "Demasiados intentos realizados. Espere unos segundos antes de intentar nuevamente.";
      case 500:
        return "Error interno del servidor. Por favor comuníquese con soporte técnico o intente más tarde.";
      case 502:
      case 503:
      case 504:
        return "Servicio temporalmente no disponible. Intente nuevamente en unos instantes.";
      default:
        return `Error en la solicitud (Código ${error.response.status}).`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No fue posible completar la operación.";
}
