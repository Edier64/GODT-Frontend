<script setup lang="ts">
import { useRoute } from "vue-router";
import DocumentDropzone from "../components/DocumentDropzone.vue";
import DocumentList from "../components/DocumentList.vue";
import { useDocumentsController } from "../controllers/useDocumentsController";

const route = useRoute();
const donorId = String(route.params.donorId);
const {
  documents,
  filteredDocuments,
  selected,
  loading,
  uploading,
  error,
  uploadError,
  progress,
  category,
  file,
  filters,
  selectFile,
  upload,
  showDetails,
  download,
  formatDate,
  formatSize
} = useDocumentsController(donorId);
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" to="/expedientes">← Volver a expedientes</RouterLink>
        <p class="mt-5 text-sm font-semibold text-[#159c9a]">Documentación clínica</p>
        <h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Documentos del expediente</h2>
        <p class="mt-2 text-sm text-[#6b8790]">Carga y consulta documentos fuente privados asociados a este expediente.</p>
      </div>
      <span class="rounded-full bg-[#e6f7f4] px-3 py-2 text-xs font-semibold text-[#17817d]">Acceso protegido</span>
    </div>

    <div class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="order-2 rounded-2xl border border-[#dce6eb] bg-white xl:order-1">
        <div class="flex flex-col gap-3 border-b border-[#edf2f3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 class="font-bold text-[#17313b]">Documentos fuente</h3><p class="mt-1 text-xs text-[#789098]">{{ documents.length }} documento(s) asociado(s)</p></div>
          <input v-model="filters.query" class="focus-ring rounded-lg border border-[#cbdce2] px-3 py-2 text-xs" placeholder="Buscar documento" />
        </div>
        <div v-if="loading" class="space-y-3 p-5" aria-label="Cargando documentos"><div v-for="index in 3" :key="index" class="h-16 animate-pulse rounded-xl bg-[#f0f4f6]" /></div>
        <p v-else-if="error" class="m-5 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
        <DocumentList v-else-if="filteredDocuments.length" :documents="filteredDocuments" :format-date="formatDate" @details="showDetails" @download="download" />
        <div v-else class="px-5 py-14 text-center"><div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf4f6] text-[#789098]">—</div><p class="mt-4 text-sm font-semibold text-[#17313b]">{{ documents.length ? "No hay coincidencias" : "Aún no hay documentos" }}</p><p class="mt-2 text-xs text-[#789098]">{{ documents.length ? "Prueba con otro término de búsqueda." : "Carga el primer documento fuente de este expediente." }}</p></div>
      </div>

      <div class="order-1 rounded-2xl border border-[#dce6eb] bg-white p-5 xl:order-2">
        <h3 class="font-bold text-[#17313b]">Cargar documento</h3>
        <p class="mt-1 text-xs leading-5 text-[#789098]">El backend valida tamaño, formato y firma del archivo antes de almacenarlo.</p>
        <DocumentDropzone :disabled="uploading" @selected="selectFile" />
        <div v-if="file" class="mt-4 rounded-xl bg-[#f5f8fa] p-3"><p class="truncate text-xs font-semibold text-[#17313b]">{{ file.name }}</p><p class="mt-1 text-xs text-[#789098]">{{ formatSize(file.size) }}</p></div>
        <label class="mt-4 block text-xs font-semibold text-[#49636b]">Categoría del documento<input v-model="category" class="focus-ring mt-2 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" placeholder="Categoría definida por tu operación" :disabled="uploading" /></label>
        <p v-if="uploadError" class="mt-4 rounded-xl bg-[#fff0ef] p-3 text-xs leading-5 text-[#ad4039]">{{ uploadError }}</p>
        <div v-if="progress" class="mt-4"><div class="flex justify-between text-xs text-[#789098]"><span>Cargando documento</span><span>{{ progress.percentage }}%</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-[#e7eff1]"><div class="h-full rounded-full bg-[#159c9a] transition-all" :style="{ width: `${progress.percentage}%` }" /></div></div>
        <button class="focus-ring mt-5 w-full rounded-lg bg-[#123047] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e5575] disabled:opacity-50" :disabled="uploading" @click="upload">{{ uploading ? "Cargando…" : "Cargar documento" }}</button>
        <p class="mt-3 text-center text-[11px] leading-4 text-[#8ba0a6]">Los archivos permanecen privados y requieren autorización para descargarse.</p>
      </div>
    </div>

    <div v-if="selected" class="fixed inset-0 z-10 grid place-items-center bg-[#123047]/40 p-4" @click.self="selected = null">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between"><div><p class="text-xs font-semibold uppercase tracking-wide text-[#159c9a]">Detalle del documento</p><h3 class="mt-2 break-all text-lg font-bold text-[#17313b]">{{ selected.originalFilename }}</h3></div><button class="focus-ring text-2xl text-[#789098]" @click="selected = null">×</button></div>
        <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt class="text-xs text-[#789098]">Categoría</dt><dd class="mt-1 font-semibold text-[#17313b]">{{ selected.documentCategory }}</dd></div><div><dt class="text-xs text-[#789098]">Tipo</dt><dd class="mt-1 font-semibold text-[#17313b]">{{ selected.mimeType }}</dd></div><div><dt class="text-xs text-[#789098]">Estado</dt><dd class="mt-1 font-semibold text-[#17313b]">{{ selected.status }}</dd></div><div><dt class="text-xs text-[#789098]">Cargado</dt><dd class="mt-1 font-semibold text-[#17313b]">{{ formatDate(selected.uploadedAt) }}</dd></div></dl>
        <button class="focus-ring mt-7 w-full rounded-lg border border-[#cbdce2] px-4 py-3 text-sm font-semibold text-[#1e5575]" @click="download(selected)">Descargar documento</button>
      </div>
    </div>
  </section>
</template>
