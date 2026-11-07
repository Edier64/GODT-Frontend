<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const token = ref("");

const DEV_TOKENS = {
  COORDINATOR:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiQ09PUkRJTkFUT1IiLCJlbWFpbCI6ImNvb3JkaW5hZG9yQGdvZHQuZ292LmNvIiwibmFtZSI6IkRyYS4gRWxlbmEgUmFtb3MgKENvb3JkaW5hZG9yYSBSZWdpb25hbCAzKSIsImluc3RpdHV0aW9uYWxJcHMiOlsiSG9zcGl0YWwgVW5pdmVyc2l0YXJpbyBkZWwgVmFsbGUiLCJDbMOtbmljYSBJbWJhbmFjbyIsIkNsw61uaWNhIE9jY2lkZW50ZSIsIkZ1bmRhY2nDs24gVmFsbGUgZGVsIExpbGkiXSwiaWF0IjoxNzk0MDA5NTU2LCJleHAiOjE4MjU1NDU1NTYsImlzcyI6ImdvZHQtYmFja2VuZCJ9.384STlmBvSwe2Z4jjCiZfXJftaCg3Oi0wLI1fLnzDI4",
  ADMIN:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDIiLCJyb2xlIjoiQURNSU4iLCJlbWFpbCI6ImFkbWluQGdvZHQuZ292LmNvIiwibmFtZSI6IkFkbWluaXN0cmFkb3IgZGVsIFNpc3RlbWEgR09EVCIsImluc3RpdHV0aW9uYWxJcHMiOlsiSG9zcGl0YWwgVW5pdmVyc2l0YXJpbyBkZWwgVmFsbGUiLCJDbMOtbmljYSBJbWJhbmFjbyJdLCJpYXQiOjE3OTQwMDk1NTYsImV4cCI6MTgyNTU0NTU1NiwiaXNzIjoiZ29kdC1iYWNrZW5kIn0.oCzbbOo0cCVuX2kw1KYQLz5zvNeaXc1RfN94x2YcyJg",
};

function save() {
  auth.setToken(token.value);
  if (auth.isAuthenticated) void router.replace("/dashboard");
}

function loginQuick(role: "COORDINATOR" | "ADMIN") {
  token.value = DEV_TOKENS[role];
  save();
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-lg rounded-2xl border border-[#dce6eb] bg-white p-6 shadow-sm sm:p-8">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#159c9a]">Acceso institucional</p>
    <h1 class="mt-2 text-2xl font-bold text-[#17313b]">Configura tu sesión</h1>
    <p class="mt-3 text-sm leading-6 text-[#6b8790]">El backend de GODT emite el JWT. El frontend solo lo adjunta a las solicitudes y no sustituye la autorización del servidor.</p>
    
    <!-- Sesiones Rápidas para Desarrollo y Pruebas -->
    <div class="mt-5 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
      <p class="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2">
        ⚡ Sesión Rápida de Prueba (Desarrollo):
      </p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          class="flex flex-col items-start p-2.5 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 transition-colors cursor-pointer text-left shadow-2xs"
          @click="loginQuick('COORDINATOR')"
        >
          <span class="font-bold text-teal-900">👩‍⚕️ Coordinador(a)</span>
          <span class="text-[11px] text-teal-700">Dra. Elena Ramos</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-start p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left shadow-2xs"
          @click="loginQuick('ADMIN')"
        >
          <span class="font-bold text-slate-800">🛡️ Administrador</span>
          <span class="text-[11px] text-slate-600">Admin GODT</span>
        </button>
      </div>
    </div>

    <form class="mt-6" @submit.prevent="save">
      <label class="text-sm font-semibold text-[#17313b]" for="access-token">O pega tu Token JWT manual:</label>
      <textarea id="access-token" v-model="token" autocomplete="off" class="focus-ring mt-2 min-h-24 w-full rounded-xl border border-[#cbdcdf] p-3 text-xs font-mono" placeholder="eyJ..." />
      <button class="focus-ring mt-4 w-full rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer" :disabled="!token.trim()" type="submit">Iniciar sesión</button>
    </form>
  </section>
</template>
