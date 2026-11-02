<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p class="text-sm font-semibold text-[#4c8f89]">Inicio</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Resumen operativo</h2><p class="mt-2 max-w-2xl text-sm text-[#6b8790]">Gestiona expedientes y continúa el flujo documental desde un solo lugar.</p></div>
      <RouterLink class="focus-ring rounded-xl bg-[#123c4a] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1b5363]" to="/expedientes">Ver expedientes</RouterLink>
    </div>
    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-[#dce7e9] bg-white p-5"><p class="text-sm text-[#6b8790]">Expedientes</p><p class="mt-3 text-3xl font-bold text-[#17313b]">—</p><p class="mt-2 text-xs text-[#8ba0a6]">Consulta el listado real del backend</p></div>
      <div class="rounded-2xl border border-[#dce7e9] bg-white p-5"><p class="text-sm text-[#6b8790]">Documentación</p><p class="mt-3 text-3xl font-bold text-[#17313b]">Disponible</p><p class="mt-2 text-xs text-[#8ba0a6]">Motor documental preparado para integración</p></div>
      <div class="rounded-2xl border border-[#dce7e9] bg-white p-5"><p class="text-sm text-[#6b8790]">Legalización</p><p class="mt-3 text-3xl font-bold text-[#17313b]">Disponible</p><p class="mt-2 text-xs text-[#8ba0a6]">Requiere rol ADMIN o COORDINATOR</p></div>
    </div>
  </section>
</template>
