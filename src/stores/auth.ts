import { computed, ref } from "vue";
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("godt.jwtToken") ?? "");
  const isAuthenticated = computed(() => token.value.length > 0);

  function setToken(value: string) {
    token.value = value.trim();
    if (token.value) localStorage.setItem("godt.jwtToken", token.value);
    else localStorage.removeItem("godt.jwtToken");
  }

  function logout() { setToken(""); }
  return { token, isAuthenticated, setToken, logout };
});
