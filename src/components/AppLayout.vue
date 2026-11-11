<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const userInitials = computed(() => {
  const name = auth.user?.fullName?.trim();
  if (!name) return "U";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
});

async function handleLogout() {
  await auth.logout();
  await router.replace({ path: "/acceso" });
}

function handleSessionExpired() {
  auth.clearSession();
  if (route.path !== "/acceso") {
    void router.replace({
      path: "/acceso",
      query: { reason: "expired", redirect: route.fullPath },
    });
  }
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
      <div class="mt-auto hidden border-t border-white/10 p-4 lg:block space-y-2">
        <div v-if="auth.isAuthenticated && auth.user" class="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-2.5 text-left text-sm text-white/90">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-[#159c9a] text-xs font-bold shrink-0">{{ userInitials }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-semibold truncate">{{ auth.user.fullName }}</span>
            <span class="block text-[11px] text-white/55 truncate">{{ auth.user.role }} · {{ auth.user.email }}</span>
          </span>
        </div>
        <button
          v-if="auth.isAuthenticated"
          type="button"
          :disabled="auth.loading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50"
          @click="handleLogout"
        >
          <span>Cerrar sesión</span>
        </button>
        <RouterLink
          v-else
          to="/acceso"
          class="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/20 transition-colors"
        >
          <span>Iniciar sesión institucional</span>
        </RouterLink>
      </div>
    </aside>
    <div class="min-w-0 flex-1 overflow-x-hidden">
      <header class="flex items-center justify-between border-b border-[#e1e8ed] bg-white px-5 py-4 sm:px-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b8790]">Gestión operativa</p>
          <p class="mt-1 text-sm text-[#49636b]">Donación y trasplante de órganos y tejidos · GODT Regional 3</p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="auth.isAuthenticated && auth.user" class="hidden text-xs font-medium text-[#123047] sm:inline lg:hidden">
            {{ auth.user.fullName }} ({{ auth.user.role }})
          </span>
          <button
            v-if="auth.isAuthenticated"
            type="button"
            class="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 lg:hidden cursor-pointer"
            @click="handleLogout"
          >
            Cerrar sesión
          </button>
          <RouterLink
            v-else
            to="/acceso"
            class="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            Acceso
          </RouterLink>
        </div>
      </header>
      <main class="mx-auto max-w-[1192px] p-5 sm:p-8 lg:py-10 w-full min-w-0"><slot><RouterView /></slot></main>
    </div>
  </div>
</template>
