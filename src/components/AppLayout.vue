<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const showToken = ref(false);
const tokenDraft = ref(auth.token);

function saveToken() {
  auth.setToken(tokenDraft.value);
  showToken.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-[#f5f8f9] lg:flex">
    <aside class="flex w-full flex-col bg-[#123c4a] text-white lg:min-h-screen lg:w-64">
      <div class="border-b border-white/10 px-6 py-6">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#65c6b8]">Regional 3</p>
        <h1 class="mt-1 text-xl font-bold">GODT</h1>
      </div>
      <nav class="flex gap-2 overflow-x-auto p-4 lg:block lg:space-y-2">
        <RouterLink class="focus-ring block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white" to="/dashboard">Resumen</RouterLink>
        <RouterLink class="focus-ring block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white" to="/expedientes">Expedientes</RouterLink>
        <span class="block rounded-xl px-4 py-3 text-sm text-white/35">Documentación</span>
        <span class="block rounded-xl px-4 py-3 text-sm text-white/35">Legalización</span>
        <span class="block rounded-xl px-4 py-3 text-sm text-white/35">Reportes</span>
      </nav>
      <div class="mt-auto hidden border-t border-white/10 p-4 lg:block">
        <button class="focus-ring w-full rounded-xl border border-white/20 px-4 py-3 text-left text-sm text-white/75 hover:bg-white/10" @click="showToken = true">
          {{ auth.isAuthenticated ? "JWT configurado" : "Configurar JWT" }}
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <header class="flex items-center justify-between border-b border-[#dce7e9] bg-white px-5 py-4 sm:px-8">
        <div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b8790]">Sistema de gestión</p><p class="mt-1 text-sm text-[#49636b]">Donación y trasplante de órganos y tejidos</p></div>
        <button class="focus-ring rounded-lg px-3 py-2 text-sm text-[#49636b] hover:bg-[#f1f6f7] lg:hidden" @click="showToken = true">{{ auth.isAuthenticated ? "JWT" : "Configurar" }}</button>
      </header>
      <main class="mx-auto max-w-[1440px] p-5 sm:p-8"><RouterView /></main>
    </div>
    <div v-if="showToken" class="fixed inset-0 z-10 grid place-items-center bg-[#123c4a]/40 p-4" @click.self="showToken = false">
      <form class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="saveToken">
        <h2 class="text-lg font-bold text-[#17313b]">Token de acceso</h2>
        <p class="mt-2 text-sm text-[#6b8790]">El backend no expone login. Pega aquí un JWT emitido por tu proveedor de identidad.</p>
        <textarea v-model="tokenDraft" class="focus-ring mt-5 min-h-28 w-full rounded-xl border border-[#cbdcdf] p-3 text-sm" placeholder="eyJ..." />
        <div class="mt-5 flex justify-end gap-3"><button type="button" class="focus-ring rounded-lg px-4 py-2 text-sm text-[#49636b]" @click="showToken = false">Cancelar</button><button class="focus-ring rounded-lg bg-[#123c4a] px-4 py-2 text-sm font-semibold text-white" type="submit">Guardar</button></div>
      </form>
    </div>
  </div>
</template>
