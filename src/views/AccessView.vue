<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiError } from "../services/api";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref("");

const sessionExpiredNotice = computed(() => route.query.reason === "expired");
const canSubmit = computed(
  () => !loading.value && !auth.loading && email.value.trim().length > 0 && password.value.length > 0,
);

function resolveSafeRedirect(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/acceso")) {
    return "/dashboard";
  }
  return raw;
}

async function handleInstitutionalLogin() {
  if (loading.value || auth.loading) return;

  const loginEmail = email.value.trim();
  if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
    errorMessage.value = "Por favor ingresa un correo institucional válido.";
    return;
  }

  if (!password.value) {
    errorMessage.value = "Por favor ingresa tu contraseña institucional.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    await auth.login(loginEmail, password.value);
    password.value = "";
    await router.replace(resolveSafeRedirect(route.query.redirect));
  } catch (err: unknown) {
    errorMessage.value = getApiError(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-md rounded-2xl border border-[#dce6eb] bg-white p-6 shadow-sm sm:p-8">
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl bg-[#123047] text-sm font-bold text-[#5ed1c8]">
        G
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#159c9a]">Acceso institucional</p>
        <h1 class="text-xl font-bold text-[#123047]">Sistema GODT Regional 3</h1>
      </div>
    </div>

    <p class="mt-3 text-sm leading-6 text-[#6b8790]">
      Ingresa con tu correo institucional y contraseña autorizados ante la Red de Donación y Trasplantes.
    </p>

    <div
      v-if="sessionExpiredNotice && !errorMessage"
      role="status"
      class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
    >
      Tu sesión institucional expiró o fue cerrada. Inicia sesión nuevamente para continuar.
    </div>

    <div
      v-if="errorMessage"
      role="alert"
      class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
    >
      {{ errorMessage }}
    </div>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="handleInstitutionalLogin">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-[#123047]" for="email">
          Correo Institucional
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="username"
          :disabled="loading"
          placeholder="usuario@godt.gov.co"
          class="focus-ring mt-1.5 w-full rounded-xl border border-[#cbdcdf] bg-white px-3.5 py-2.5 text-sm text-[#17313b] disabled:bg-slate-50"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-[#123047]" for="password">
          Contraseña
        </label>
        <div class="relative mt-1.5">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            :disabled="loading"
            placeholder="••••••••••••"
            class="focus-ring w-full rounded-xl border border-[#cbdcdf] bg-white py-2.5 pl-3.5 pr-20 text-sm text-[#17313b] disabled:bg-slate-50"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-2 my-1 rounded-lg px-2.5 text-xs font-medium text-[#1e5575] hover:bg-[#f1f6f7] cursor-pointer"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "Ocultar" : "Mostrar" }}
          </button>
        </div>
      </div>

      <button
        class="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123047] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e5575] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        :disabled="!canSubmit"
        type="submit"
      >
        <span
          v-if="loading"
          class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-hidden="true"
        />
        <span>{{ loading ? "Verificando credenciales..." : "Iniciar sesión institucional" }}</span>
      </button>
    </form>

    <p class="mt-6 border-t border-slate-100 pt-4 text-[11px] leading-5 text-[#6b8790]">
      El acceso es exclusivo para personal previamente habilitado por la Coordinación Regional y Administración del Sistema.
    </p>
  </section>
</template>
