<script setup lang="ts">
import { useRoute } from "vue-router";
import DocumentViewer from "../components/DocumentViewer.vue";
import OcrFieldCard from "../components/OcrFieldCard.vue";
import OcrJobStatus from "../components/OcrJobStatus.vue";
import { useOcrController } from "../controllers/useOcrController";

const route = useRoute();
const donorId = String(route.params.donorId);
const {
  document,
  job,
  fields,
  loading,
  starting,
  validating,
  error,
  fieldError,
  activeField,
  editedValue,
  statusLabel,
  start,
  openValidation,
  closeValidation,
  validate,
  formatDate
} = useOcrController(String(route.params.documentId));
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/documentos`">← Volver a documentos</RouterLink>
        <p class="mt-5 text-sm font-semibold text-[#159c9a]">OCR y validación humana</p>
        <h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Revisión de campos extraídos</h2>
        <p class="mt-2 text-sm text-[#6b8790]">Los resultados OCR son candidatos y no se consideran datos clínicos confirmados hasta su revisión.</p>
      </div>
      <button class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e5575] disabled:opacity-50" :disabled="starting || !document" @click="start">{{ starting ? "Iniciando…" : job ? "Procesar nuevamente" : "Iniciar OCR" }}</button>
    </div>

    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
    <div v-if="loading" class="mt-8 grid gap-6 lg:grid-cols-2"><div class="h-[520px] animate-pulse rounded-2xl bg-[#e8eef1]" /><div class="space-y-4"><div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-xl bg-[#e8eef1]" /></div></div>
    <div v-else-if="document" class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div class="min-w-0">
        <div class="mb-3"><h3 class="font-bold text-[#17313b]">Documento fuente</h3><p class="mt-1 break-all text-xs text-[#789098]">{{ document.originalFilename }}</p></div>
        <DocumentViewer :document="document" />
      </div>
      <div class="min-w-0">
        <OcrJobStatus :job="job" :label="(status) => statusLabel[status]" />
        <div v-if="!job" class="mt-4 rounded-2xl border border-[#dce6eb] bg-white p-8 text-center"><p class="text-sm font-semibold text-[#17313b]">Inicia el procesamiento OCR</p><p class="mt-2 text-xs leading-5 text-[#789098]">El backend creará un trabajo asíncrono para extraer candidatos de este documento.</p></div>
        <div v-else-if="job.status === 'FALLIDO'" class="mt-4 rounded-2xl border border-[#efc5c1] bg-white p-8 text-center"><p class="text-sm font-semibold text-[#ad4039]">El procesamiento no se completó</p><p class="mt-2 text-xs text-[#789098]">Revisa el código de error y vuelve a intentar si corresponde.</p></div>
        <div v-else-if="!fields.length" class="mt-4 rounded-2xl border border-[#dce6eb] bg-white p-8 text-center"><p class="text-sm font-semibold text-[#17313b]">Esperando campos extraídos</p><p class="mt-2 text-xs leading-5 text-[#789098]">Los campos aparecerán cuando el trabajo asíncrono los genere.</p></div>
        <div v-else class="mt-4 space-y-3"><div class="flex items-center justify-between"><h3 class="font-bold text-[#17313b]">Campos extraídos</h3><span class="text-xs text-[#789098]">{{ fields.length }} campo(s)</span></div><OcrFieldCard v-for="field in fields" :key="field.id" :field="field" :format-date="formatDate" @validate="openValidation" /></div>
      </div>
    </div>

    <div v-if="activeField" class="fixed inset-0 z-10 grid place-items-center bg-[#123047]/40 p-4" @click.self="closeValidation">
      <form class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="validate('MODIFICADO')">
        <div class="flex items-start justify-between"><div><p class="text-xs font-semibold uppercase tracking-wide text-[#159c9a]">Validación humana</p><h3 class="mt-2 text-xl font-bold text-[#17313b]">{{ activeField.canonicalFieldKey }}</h3></div><button type="button" class="focus-ring text-2xl text-[#789098]" @click="closeValidation">×</button></div>
        <div class="mt-5 rounded-xl bg-[#fffaf0] p-4"><p class="text-xs text-[#856800]">Candidato OCR</p><p class="mt-2 break-words text-sm font-semibold text-[#17313b]">{{ activeField.candidateValue }}</p></div>
        <label class="mt-5 block text-sm font-semibold text-[#49636b]">Valor a confirmar o modificar<textarea v-model="editedValue" class="focus-ring mt-2 min-h-24 w-full rounded-xl border border-[#cbdce2] p-3 text-sm font-normal" /></label>
        <p v-if="fieldError" class="mt-4 rounded-xl bg-[#fff0ef] p-3 text-xs leading-5 text-[#ad4039]">{{ fieldError }}</p>
        <div class="mt-6 grid gap-2 sm:grid-cols-3"><button type="button" class="focus-ring rounded-lg border border-[#b9e2d7] px-3 py-3 text-xs font-semibold text-[#18735e] disabled:opacity-50" :disabled="!!validating" @click="validate('CONFIRMADO')">Confirmar candidato</button><button type="submit" class="focus-ring rounded-lg bg-[#1e5575] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50" :disabled="!!validating">Guardar modificación</button><button type="button" class="focus-ring rounded-lg border border-[#efc5c1] px-3 py-3 text-xs font-semibold text-[#ad4039] disabled:opacity-50" :disabled="!!validating" @click="validate('RECHAZADO')">Rechazar</button></div>
      </form>
    </div>
  </section>
</template>
