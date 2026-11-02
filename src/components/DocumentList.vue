<script setup lang="ts">
import type { SourceDocument } from "../types/documents";

defineProps<{
  documents: SourceDocument[];
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  details: [id: string];
  download: [document: SourceDocument];
  ocr: [id: string];
}>();
</script>

<template>
  <div class="divide-y divide-[#edf2f3]">
    <article v-for="document in documents" :key="document.id" class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf2f6] text-xs font-bold uppercase text-[#1e5575]">
          {{ document.mimeType === "application/pdf" ? "PDF" : "IMG" }}
        </div>
        <div class="min-w-0">
          <button class="focus-ring max-w-full truncate text-left text-sm font-semibold text-[#17313b] hover:text-[#159c9a]" @click="emit('details', document.id)">{{ document.originalFilename }}</button>
          <p class="mt-1 text-xs text-[#789098]">{{ document.documentCategory }} · {{ formatDate(document.uploadedAt) }}</p>
        </div>
      </div>
      <div class="flex shrink-0 gap-2 sm:justify-end">
        <button class="focus-ring rounded-lg px-3 py-2 text-xs font-semibold text-[#1e5575] hover:bg-[#eff8f6]" @click="emit('details', document.id)">Ver detalle</button>
        <RouterLink class="focus-ring rounded-lg px-3 py-2 text-xs font-semibold text-[#159c9a] hover:bg-[#eff8f6]" :to="`/expedientes/${document.donorId}/documentos/${document.id}/ocr`">OCR</RouterLink>
        <button class="focus-ring rounded-lg border border-[#cbdce2] px-3 py-2 text-xs font-semibold text-[#1e5575] hover:bg-[#f7fafb]" @click="emit('download', document)">Descargar</button>
      </div>
    </article>
  </div>
</template>
