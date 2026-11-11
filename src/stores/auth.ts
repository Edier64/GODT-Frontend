import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { api } from "../services/api";
import {
  clearAccessToken,
  registerRefreshHandler,
  registerSessionExpiredHandler,
  setAccessToken,
} from "../services/authSessionBridge";
import { templateCache } from "../services/templateCache";

export type UserRole = "COORDINATOR" | "SURGEON" | "TECHNICIAN" | "ADMIN";

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  institutionalIps: string[];
}

interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUserProfile;
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string>("");
  const user = ref<AuthUserProfile | null>(null);
  const initialized = ref<boolean>(false);
  const loading = ref<boolean>(false);

  let inFlightInit: Promise<boolean> | null = null;
  let inFlightRefresh: Promise<string | null> | null = null;

  const isAuthenticated = computed(() => token.value.length > 0 && user.value !== null);

  function setSession(payload: { accessToken: string; user: AuthUserProfile }) {
    token.value = payload.accessToken.trim();
    user.value = payload.user;
    setAccessToken(token.value);
  }

  function clearSession() {
    token.value = "";
    user.value = null;
    clearAccessToken();
    void templateCache.clear().catch(() => undefined);
  }

  async function refreshSession(): Promise<string | null> {
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    inFlightRefresh = (async () => {
      try {
        const { data } = await api.post<AuthTokenResponse>("/auth/refresh", {});
        if (!data?.accessToken || !data?.user) {
          clearSession();
          return null;
        }
        setSession({ accessToken: data.accessToken, user: data.user });
        return data.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  }

  async function fetchMe(): Promise<AuthUserProfile> {
    const { data } = await api.get<AuthUserProfile>("/auth/me");
    user.value = data;
    return data;
  }

  async function login(email: string, password: string): Promise<AuthUserProfile> {
    loading.value = true;
    try {
      const { data } = await api.post<AuthTokenResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      setSession({ accessToken: data.accessToken, user: data.user });
      initialized.value = true;
      return data.user;
    } finally {
      loading.value = false;
    }
  }

  async function initializeSession(): Promise<boolean> {
    if (initialized.value) {
      return isAuthenticated.value;
    }
    if (inFlightInit) {
      return inFlightInit;
    }

    inFlightInit = (async () => {
      loading.value = true;
      try {
        const refreshedToken = await refreshSession();
        if (!refreshedToken) {
          return false;
        }
        await fetchMe();
        return isAuthenticated.value;
      } catch {
        clearSession();
        return false;
      } finally {
        initialized.value = true;
        loading.value = false;
        inFlightInit = null;
      }
    })();

    return inFlightInit;
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Aunque falle la red, limpiar el estado en memoria del navegador
    } finally {
      clearSession();
      initialized.value = true;
      loading.value = false;
    }
  }

  registerRefreshHandler(refreshSession);
  registerSessionExpiredHandler(clearSession);

  return {
    token,
    user,
    initialized,
    loading,
    isAuthenticated,
    login,
    refreshSession,
    fetchMe,
    initializeSession,
    logout,
    clearSession,
  };
});
