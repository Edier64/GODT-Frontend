<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const token = ref("");

function save() {
  auth.setToken(token.value);
  if (auth.isAuthenticated) void router.replace("/dashboard");
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-lg rounded-2xl border border-[#dce6eb] bg-white p-6 shadow-sm sm:p-8">
    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#159c9a]">Acceso institucional</p>
    <h1 class="mt-2 text-2xl font-bold text-[#17313b]">Configura tu sesión</h1>
    <p class="mt-3 text-sm leading-6 text-[#6b8790]">El backend de GODT emite el JWT. El frontend solo lo adjunta a las solicitudes y no sustituye la autorización del servidor.</p>
    <form class="mt-6" @submit.prevent="save">
      <label class="text-sm font-semibold text-[#17313b]" for="access-token">Token JWT</label>
      <textarea id="access-token" v-model="token" autocomplete="off" class="focus-ring mt-2 min-h-32 w-full rounded-xl border border-[#cbdcdf] p-3 text-sm" placeholder="eyJ..." />
      <button class="focus-ring mt-4 w-full rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="!token.trim()" type="submit">Iniciar sesión</button>
    </form>
  </section>
</template>
