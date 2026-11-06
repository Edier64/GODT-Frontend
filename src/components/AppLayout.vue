<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const showToken = ref(false);
const tokenDraft = ref(auth.token);

function saveToken() {
  auth.setToken(tokenDraft.value);
  showToken.value = false;
}

function handleSessionExpired() {
  auth.logout();
  showToken.value = false;
  void router.replace({ path: "/acceso", query: { reason: "expired" } });
}

onMounted(() => window.addEventListener("godt:session-expired", handleSessionExpired));
onBeforeUnmount(() => window.removeEventListener("godt:session-expired", handleSessionExpired));
</script>

<template>
  <div class="min-h-screen bg-[#f5f7fa] lg:flex">
    <aside class="flex w-full flex-col bg-[#123047] text-white lg:min-h-screen lg:w-[248px]">
      <div class="border-b border-white/10 px-6 py-7">
        <div class="flex items-center gap-3">
          <div class="grid h-9 w-9 place-items-center rounded-lg border border-[#159c9a]/60 text-sm font-bold text-[#5ed1c8]">G</div>
          <div><p class="text-base font-bold tracking-wide">GODT</p><p class="text-[10px] uppercase tracking-[0.2em] text-white/55">Regional 3</p></div>
        </div>
      </div>
      <nav aria-label="Navegación principal" class="app-scrollbar flex gap-2 overflow-x-auto p-4 lg:block lg:space-y-1">
        <p class="px-4 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Workspace</p>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/dashboard">Resumen</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/procesos">Procesos de Donación</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/expedientes">Expedientes</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/catalogo-documental">Catálogo documental</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/expedientes">Documentación clínica</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/expedientes">OCR y validación</RouterLink>
        <RouterLink active-class="bg-[#1e5575] text-white shadow-sm" class="focus-ring block rounded-lg px-4 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" to="/expedientes">Legalización</RouterLink>
        <span aria-disabled="true" class="block rounded-lg px-4 py-3 text-sm text-white/30">Reportes no disponibles</span>
      </nav>
      <div class="mt-auto hidden border-t border-white/10 p-4 lg:block">
        <button class="focus-ring flex w-full items-center gap-3 rounded-lg border border-white/15 px-3 py-3 text-left text-sm text-white/75 hover:bg-white/10" @click="showToken = true">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-[#159c9a] text-xs font-bold">U</span>
          <span><span class="block text-xs font-semibold">{{ auth.isAuthenticated ? "Sesión activa" : "Sin sesión" }}</span><span class="block text-[11px] text-white/45">Configurar acceso</span></span>
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <header class="flex items-center justify-between border-b border-[#e1e8ed] bg-white px-5 py-4 sm:px-8">
        <div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b8790]">Gestión operativa</p><p class="mt-1 text-sm text-[#49636b]">Donación y trasplante de órganos y tejidos</p></div>
        <button class="focus-ring rounded-lg px-3 py-2 text-sm text-[#49636b] hover:bg-[#f1f6f7] lg:hidden" @click="showToken = true">{{ auth.isAuthenticated ? "JWT" : "Configurar" }}</button>
      </header>
      <main class="mx-auto max-w-[1192px] p-5 sm:p-8 lg:py-10"><RouterView /></main>
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
