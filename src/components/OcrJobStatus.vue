<script setup lang="ts">
import type { OcrJob, OcrJobStatus } from "../types/ocr";

defineProps<{
  job: OcrJob | null;
  label: (status: OcrJobStatus) => string;
}>();
</script>

<template>
  <div v-if="job" class="rounded-xl border p-4" :class="{
    'border-[#f0d99a] bg-[#fffaf0]': job.status === 'EN_COLA',
    'border-[#b9e2d7] bg-[#effaf6]': job.status === 'COMPLETADO',
    'border-[#efc5c1] bg-[#fff4f3]': job.status === 'FALLIDO'
  }">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-[#17313b]">{{ label(job.status) }}</p>
      <span class="text-xs font-bold" :class="job.status === 'FALLIDO' ? 'text-[#ad4039]' : 'text-[#17817d]'">{{ job.status }}</span>
    </div>
    <p class="mt-2 text-xs text-[#789098]">Proveedor: {{ job.providerName }} · Trabajo {{ job.id }}</p>
    <p v-if="job.errorCode" class="mt-2 text-xs font-medium text-[#ad4039]">Código de error: {{ job.errorCode }}</p>
  </div>
</template>
