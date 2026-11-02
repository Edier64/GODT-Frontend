<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useDonorsStore } from "../stores/donors";

const donors = useDonorsStore();
const donorTotal = ref<number | null>(null);
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  await donors.fetch({ page: 1, pageSize: 1 });
  if (!donors.error) donorTotal.value = donors.page.total;
  loading.value = false;
});

const apiStatus = computed(() => loading.value ? "Consultando" : donors.error ? "No disponible" : "Conectado");
</script>

<template>
  <section>
    <div class="overflow-hidden rounded-3xl bg-[#123047] px-6 py-8 text-white shadow-[0_20px_50px_rgba(18,48,71,0.16)] sm:px-10 sm:py-10">
      <div class="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#5ed1c8]">Gestión documental · Donación y trasplantes</p>
          <h2 class="mt-5 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">Validar una vez.<br />Reutilizar con confianza.</h2>
          <p class="mt-5 max-w-lg text-sm leading-6 text-white/65">De la evidencia clínica al documento final. Un espacio de trabajo trazable, centrado en decisiones profesionales.</p>
          <RouterLink class="focus-ring mt-7 inline-flex rounded-lg bg-[#159c9a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#20b5ae]" to="/expedientes">Abrir expedientes</RouterLink>
        </div>
        <div class="rounded-2xl bg-white p-5 text-[#17313b] shadow-2xl sm:p-6">
          <div class="flex items-start justify-between"><div><p class="text-xs font-bold uppercase tracking-wide text-[#6b8790]">Estado operativo</p><p class="mt-2 text-lg font-bold">Un dato, con toda su evidencia</p></div><span class="rounded-full bg-[#e6f7f4] px-3 py-1 text-[11px] font-semibold text-[#17817d]">En valoración</span></div>
          <div class="mt-7 grid grid-cols-2 gap-4 border-t border-[#e7edef] pt-5"><div><p class="text-xs text-[#789098]">Expedientes registrados</p><p v-if="loading" class="mt-2 h-9 w-16 animate-pulse rounded bg-[#e7edef]" aria-label="Cargando expedientes" /><p v-else class="mt-2 text-3xl font-bold">{{ donorTotal ?? "—" }}</p></div><div><p class="text-xs text-[#789098]">Estado API</p><p class="mt-2 text-lg font-bold" :class="donors.error ? 'text-[#ad4039]' : 'text-[#159c9a]'">{{ apiStatus }}</p></div></div>
          <p v-if="donors.error" class="mt-5 rounded-xl bg-[#fff0ef] px-4 py-3 text-xs font-medium text-[#ad4039]">{{ donors.error }}</p><p v-else class="mt-5 rounded-xl bg-[#eff8f6] px-4 py-3 text-xs font-medium text-[#2c7774]">El total proviene del listado autorizado de expedientes. No se calculan indicadores clínicos en el navegador.</p>
        </div>
      </div>
    </div>
    <div class="mt-10"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8790]">Flujo de trabajo</p><div class="mt-4 grid gap-3 md:grid-cols-5">
      <div v-for="(step, index) in ['Crear expediente', 'Cargar evidencia', 'Extraer y validar', 'Diligenciar anexos', 'Revisar y corregir']" :key="step" class="rounded-xl border border-[#dce6eb] bg-white p-4"><p class="text-xs font-bold text-[#159c9a]">0{{ index + 1 }}</p><p class="mt-6 text-sm font-semibold text-[#17313b]">{{ step }}</p><p class="mt-2 text-xs leading-5 text-[#789098]">{{ index === 0 ? "RND e IPS de origen" : index === 1 ? "Documentos fuente" : index === 2 ? "OCR y validación humana" : index === 3 ? "Plantillas publicadas" : "Revisiones y conflictos" }}</p></div>
    </div></div>
    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-[#dce6eb] bg-white p-5"><p class="text-sm font-semibold text-[#17313b]">Expedientes</p><p class="mt-2 text-xs leading-5 text-[#789098]">Consulta y actualiza el maestro de donantes.</p><RouterLink class="mt-5 inline-block text-xs font-bold text-[#159c9a]" to="/expedientes">Ir al módulo →</RouterLink></div>
      <div class="rounded-2xl border border-[#dce6eb] bg-white p-5"><p class="text-sm font-semibold text-[#17313b]">Documentación clínica</p><p class="mt-2 text-xs leading-5 text-[#789098]">Carga, consulta, descarga autenticada y OCR con validación humana.</p><RouterLink class="mt-5 inline-block text-xs font-bold text-[#159c9a]" to="/expedientes">Abrir expedientes →</RouterLink></div>
      <div class="rounded-2xl border border-[#dce6eb] bg-white p-5"><p class="text-sm font-semibold text-[#17313b]">Reportes</p><p class="mt-2 text-xs leading-5 text-[#789098]">No hay endpoints de reportes o indicadores agregados en el backend vigente.</p><span class="mt-5 inline-block text-xs font-semibold text-[#9aabb2]">No disponible</span></div>
    </div>
  </section>
</template>
