<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useDocumentCatalogController } from "../controllers/useDocumentCatalogController";
const route = useRoute();
const { templates, selected, versions, loading, error, offline, select } = useDocumentCatalogController();
const donorId = computed(() => typeof route.query.donorId === "string" ? route.query.donorId : "");
</script>

<template>
  <section>
    <div><p class="text-sm font-semibold text-[#159c9a]">Motor documental</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Catálogo de plantillas</h2><p class="mt-2 text-sm text-[#6b8790]">Consulta las definiciones autorizadas para tu alcance institucional.</p></div>
    <p v-if="offline" class="mt-6 rounded-xl bg-[#fff8e6] p-4 text-sm text-[#8a6418]">Sin conexión: se muestran las plantillas autorizadas guardadas localmente. La autorización debe verificarse nuevamente al recuperar la conexión.</p>
    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
    <div v-if="loading" class="mt-8 grid gap-4 md:grid-cols-2"><div v-for="i in 4" :key="i" class="h-36 animate-pulse rounded-2xl bg-[#e8eef1]" /></div>
    <div v-else-if="!templates.length" class="mt-8 rounded-2xl border border-[#dce6eb] bg-white px-6 py-16 text-center text-sm text-[#789098]">No hay plantillas disponibles para tu alcance institucional.</div>
    <div v-else class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="grid gap-4 md:grid-cols-2"><button v-for="template in templates" :key="template.id" class="focus-ring rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md" :class="selected?.id === template.id ? 'border-[#159c9a] ring-2 ring-[#159c9a]/15' : 'border-[#dce6eb]'" @click="select(template)"><div class="flex items-start justify-between gap-3"><span class="rounded-full bg-[#e6f7f4] px-2.5 py-1 text-[10px] font-bold text-[#17817d]">{{ template.category }}</span><span class="text-xs text-[#789098]">{{ template.status }}</span></div><h3 class="mt-5 font-bold text-[#17313b]">{{ template.name }}</h3><p class="mt-2 text-xs text-[#789098]">{{ template.templateCode }}</p><p class="mt-5 text-xs font-semibold text-[#159c9a]">{{ template.versions.length }} versión(es) visible(s)</p></button></div>
      <aside class="rounded-2xl border border-[#dce6eb] bg-white p-5"><div v-if="!selected" class="py-16 text-center text-sm text-[#789098]">Selecciona una plantilla para consultar sus versiones.</div><template v-else><p class="text-xs font-semibold uppercase tracking-wide text-[#159c9a]">Detalle de plantilla</p><h3 class="mt-2 text-xl font-bold text-[#17313b]">{{ selected.name }}</h3><p class="mt-2 text-xs text-[#789098]">{{ selected.templateCode }} · {{ selected.category }}</p><h4 class="mt-8 text-sm font-bold text-[#17313b]">Versiones</h4><div class="mt-3 space-y-2"><div v-for="version in versions" :key="version.id" class="rounded-xl border border-[#edf2f3] p-3"><div class="flex justify-between"><span class="text-sm font-semibold text-[#17313b]">v{{ version.versionNumber }}</span><span class="text-[10px] font-bold" :class="version.status === 'PUBLISHED' ? 'text-[#17817d]' : 'text-[#789098]'">{{ version.status }}</span></div><p class="mt-1 text-xs text-[#789098]">{{ version.status === 'PUBLISHED' ? 'Utilizable para nuevas instancias' : 'Solo disponible para pruebas locales de ADMIN' }}</p><RouterLink v-if="donorId" class="mt-3 inline-flex rounded-lg border border-[#1e5575] px-3 py-2 text-xs font-semibold text-[#1e5575]" :to="`/expedientes/${donorId}/instancias/nueva/${version.id}`">Abrir en expediente</RouterLink></div></div></template></aside>
    </div>
  </section>
</template>
