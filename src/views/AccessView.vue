<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { api, getApiError } from "../services/api";

const auth = useAuthStore();
const router = useRouter();

const isDev = import.meta.env.DEV;

const email = ref("");
const password = ref("");
const manualToken = ref("");
const loading = ref(false);
const errorMessage = ref("");
const showManualToken = ref(false);

async function handleInstitutionalLogin(targetEmail?: string) {
  const loginEmail = targetEmail || email.value.trim();
  if (!loginEmail) {
    errorMessage.value = "Por favor ingresa un correo institucional válido.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.post<{ accessToken: string }>("/auth/login", {
      email: loginEmail,
      password: password.value || undefined,
    });

    auth.setToken(data.accessToken);
    if (auth.isAuthenticated) {
      await router.replace("/dashboard");
    }
  } catch (err: unknown) {
    errorMessage.value = getApiError(err);
  } finally {
    loading.value = false;
  }
}

function handleManualTokenSubmit() {
  if (!manualToken.value.trim()) return;
  auth.setToken(manualToken.value);
  if (auth.isAuthenticated) void router.replace("/dashboard");
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-lg rounded-2xl border border-[#dce6eb] bg-white p-6 shadow-sm sm:p-8">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#159c9a]">Acceso institucional</p>
    <h1 class="mt-2 text-2xl font-bold text-[#17313b]">Sistema GODT Regional 3</h1>
    <p class="mt-2 text-sm leading-6 text-[#6b8790]">
      Ingresa con tus credenciales institucionales habilitadas ante la Red de Donación y Trasplantes.
    </p>

    <div v-if="errorMessage" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
      {{ errorMessage }}
    </div>

    <!-- Sesiones Rápidas Exclusivas para Desarrollo Local -->
    <div v-if="isDev" class="mt-5 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
      <p class="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>⚡</span> Modo Desarrollo — Sesión Rápida Autenticada:
      </p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          :disabled="loading"
          class="flex flex-col items-start p-2.5 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 transition-colors cursor-pointer text-left shadow-2xs disabled:opacity-50"
          @click="handleInstitutionalLogin('coordinador@godt.gov.co')"
        >
          <span class="font-bold text-teal-900">👩‍⚕️ Coordinador(a)</span>
          <span class="text-[11px] text-teal-700">Dra. Elena Ramos</span>
        </button>
        <button
          type="button"
          :disabled="loading"
          class="flex flex-col items-start p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left shadow-2xs disabled:opacity-50"
          @click="handleInstitutionalLogin('admin@godt.gov.co')"
        >
          <span class="font-bold text-slate-800">🛡️ Administrador</span>
          <span class="text-[11px] text-slate-600">Admin Regional</span>
        </button>
      </div>
    </div>

    <!-- Formulario Oficial de Login -->
    <form class="mt-6 space-y-4" @submit.prevent="() => handleInstitutionalLogin()">
      <div>
        <label class="block text-xs font-semibold text-[#17313b] uppercase tracking-wider" for="email">
          Correo Institucional
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="username"
          placeholder="usuario@godt.gov.co"
          class="focus-ring mt-1.5 w-full rounded-xl border border-[#cbdcdf] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-[#17313b] uppercase tracking-wider" for="password">
          Contraseña
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••••••"
          class="focus-ring mt-1.5 w-full rounded-xl border border-[#cbdcdf] px-3.5 py-2.5 text-sm"
        />
      </div>

      <button
        class="focus-ring mt-2 w-full rounded-xl bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[#1a4261] transition-colors"
        :disabled="loading || !email.trim()"
        type="submit"
      >
        <span v-if="loading">Verificando credenciales...</span>
        <span v-else>Iniciar sesión institucional</span>
      </button>
    </form>

    <!-- Opción de Token Manual (Colapsable) -->
    <div class="mt-6 border-t border-slate-100 pt-4">
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-800 cursor-pointer underline flex items-center gap-1"
        @click="showManualToken = !showManualToken"
      >
        <span>{{ showManualToken ? 'Ocultar' : 'Pegar token Bearer manual' }}</span>
      </button>

      <div v-if="showManualToken" class="mt-3">
        <textarea
          v-model="manualToken"
          autocomplete="off"
          class="focus-ring w-full min-h-20 rounded-xl border border-[#cbdcdf] p-3 text-xs font-mono"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />
        <button
          type="button"
          class="mt-2 w-full rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 cursor-pointer"
          :disabled="!manualToken.trim()"
          @click="handleManualTokenSubmit"
        >
          Aplicar token manual
        </button>
      </div>
    </div>
  </section>
</template>
