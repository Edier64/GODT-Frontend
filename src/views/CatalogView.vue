<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useDocumentCatalogController } from "../controllers/useDocumentCatalogController";

const route = useRoute();
const { templates, selected, versions, loading, error, offline, select } = useDocumentCatalogController();
const donorId = computed(() => typeof route.query.donorId === "string" ? route.query.donorId : "");
const searchQuery = ref("");

const filteredTemplates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.templateCode.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
  );
});
</script>

<template>
  <section>
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-[#159c9a]">Motor documental</p>
        <h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Catálogo de plantillas oficiales</h2>
        <p class="mt-2 text-sm text-[#6b8790]">Formatos oficiales estandarizados de la Red de Donación y Trasplantes (Regional 3).</p>
      </div>
      <div class="w-full sm:w-72">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar anexo o código..."
          class="w-full px-3 py-2 bg-white border border-[#cbdce2] rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#159c9a]"
        />
      </div>
    </div>

    <p v-if="offline" class="mt-6 rounded-xl bg-[#fff8e6] p-4 text-sm text-[#8a6418]">Sin conexión: se muestran las plantillas autorizadas guardadas localmente. La autorización debe verificarse nuevamente al recuperar la conexión.</p>
    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>

    <div v-if="loading" class="mt-8 grid gap-4 md:grid-cols-2"><div v-for="i in 4" :key="i" class="h-36 animate-pulse rounded-2xl bg-[#e8eef1]" /></div>
    <div v-else-if="!filteredTemplates.length" class="mt-8 rounded-2xl border border-[#dce6eb] bg-white px-6 py-16 text-center text-sm text-[#789098]">No se encontraron plantillas para el criterio de búsqueda.</div>
    <div v-else class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="grid gap-4 md:grid-cols-2">
        <button
          v-for="template in filteredTemplates"
          :key="template.id"
          class="focus-ring rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          :class="selected?.id === template.id ? 'border-[#159c9a] ring-2 ring-[#159c9a]/15' : 'border-[#dce6eb]'"
          @click="select(template)"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="rounded-full bg-[#e6f7f4] px-2.5 py-1 text-[10px] font-bold text-[#17817d]">{{ template.category }}</span>
            <span class="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{{ template.status }}</span>
          </div>
          <h3 class="mt-4 font-bold text-[#17313b] text-base leading-snug">{{ template.name }}</h3>
          <p class="mt-2 text-xs font-mono text-[#789098]">{{ template.templateCode }}</p>
          <div class="mt-4 flex items-center justify-between text-xs">
            <span class="font-semibold text-[#159c9a]">
              {{ template.versions.length }} versión(es) publicada(s)
            </span>
            <span class="text-slate-400">Ver versión →</span>
          </div>
        </button>
      </div>

      <aside class="rounded-2xl border border-[#dce6eb] bg-white p-5 self-start sticky top-6">
        <div v-if="!selected" class="py-16 text-center text-sm text-[#789098]">
          <div class="text-3xl mb-2">📑</div>
          Selecciona una plantilla para consultar sus versiones vigentes y schemas.
        </div>
        <template v-else>
          <p class="text-xs font-semibold uppercase tracking-wide text-[#159c9a]">Detalle de plantilla</p>
          <h3 class="mt-2 text-xl font-bold text-[#17313b]">{{ selected.name }}</h3>
          <p class="mt-2 text-xs text-[#789098] font-mono">{{ selected.templateCode }} · {{ selected.category }}</p>
          <h4 class="mt-6 text-sm font-bold text-[#17313b]">Versiones Disponibles</h4>
          <div class="mt-3 space-y-2">
            <div v-for="version in versions" :key="version.id" class="rounded-xl border border-[#edf2f3] p-3.5 bg-slate-50/50">
              <div class="flex justify-between items-center">
                <span class="text-sm font-semibold text-[#17313b]">Versión {{ version.versionNumber }}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="version.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'">{{ version.status }}</span>
              </div>
              <p class="mt-1.5 text-xs text-[#789098]">{{ version.status === 'PUBLISHED' ? 'Vigente para diligenciamiento oficial' : 'Solo disponible para pruebas locales' }}</p>
              <RouterLink v-if="donorId" class="mt-3 inline-flex rounded-lg bg-[#159c9a] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#12807e] transition" :to="`/expedientes/${donorId}/instancias/nueva/${version.id}`">Abrir en expediente</RouterLink>
            </div>
          </div>
        </template>
      </aside>
    </div>

    <!-- Banner informativo sobre posiciones 20 a 23 -->
    <div class="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-xs text-slate-600">
      <div class="flex items-start gap-3">
        <span class="text-lg">ℹ️</span>
        <div>
          <p class="font-bold text-slate-800 text-sm">Posiciones normativas complementarias (20 a 23)</p>
          <p class="mt-1 leading-relaxed">
            Las posiciones 20 a 23 del paquete documental oficial (Historias clínicas externas, soportes complementarios no estandarizados) permanecen en estado <code>PENDING_HOMOLOGATION</code> y no requieren plantillas dinámicas en este catálogo. Dichos soportes se incorporan como documentos fuente en la cadena de custodia del operativo.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
