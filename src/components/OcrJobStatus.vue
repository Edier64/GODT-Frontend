<script setup lang="ts">
import type { OcrJob, OcrJobStatus } from "../types/ocr";

defineProps<{
  job: OcrJob | null;
  label: (status: OcrJobStatus) => string;
}>();
</script>

<template>
  <div v-if="job" class="rounded-xl border p-4 shadow-2xs" :class="{
    'border-[#f0d99a] bg-[#fffaf0]': job.status === 'EN_COLA',
    'border-[#b9e2d7] bg-[#effaf6]': job.status === 'COMPLETADO',
    'border-[#efc5c1] bg-[#fff4f3]': job.status === 'FALLIDO'
  }">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span v-if="job.status === 'EN_COLA'" class="inline-block animate-spin text-sm">⏳</span>
        <span v-else-if="job.status === 'COMPLETADO'" class="text-sm">✅</span>
        <span v-else class="text-sm">❌</span>
        <p class="text-sm font-semibold text-[#17313b]">{{ label(job.status) }}</p>
      </div>
      <span class="text-xs font-bold px-2 py-0.5 rounded" :class="job.status === 'FALLIDO' ? 'bg-[#ffe5e2] text-[#ad4039]' : job.status === 'EN_COLA' ? 'bg-[#fff0c8] text-[#856800]' : 'bg-[#dff5ee] text-[#17817d]'">
        {{ job.status }}
      </span>
    </div>

    <!-- Flujo de etapas transparentes durante el procesamiento -->
    <div v-if="job.status === 'EN_COLA'" class="mt-3.5 border-t border-[#f3e5b8] pt-3 space-y-1.5 text-xs text-[#6e5804]">
      <div class="flex items-center gap-2">
        <span class="text-emerald-600 font-bold">✓</span> <span>1. Archivo recibido y validado</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-emerald-600 font-bold">✓</span> <span>2. Validación de formato y seguridad</span>
      </div>
      <div class="flex items-center gap-2 animate-pulse">
        <span class="text-amber-600 font-bold">▶</span> <span class="font-semibold">3. Interpretación inteligente con Gemini AI / Motor Documental</span>
      </div>
      <div class="flex items-center gap-2 text-slate-400">
        <span>○</span> <span>4. Estructuración y normalización a diccionario canónico</span>
      </div>
      <div class="flex items-center gap-2 text-slate-400">
        <span>○</span> <span>5. Pendiente de revisión humana</span>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-[#789098]">
      <span>Motor: <strong>{{ job.providerName === 'gemini' ? 'Google Gemini AI' : job.providerName }}</strong></span>
      <span class="font-mono text-[10px]">ID: {{ job.id.slice(0, 12) }}…</span>
    </div>
    <p v-if="job.errorCode" class="mt-2 text-xs font-medium text-[#ad4039]">Código de error: {{ job.errorCode }}</p>
  </div>
</template>
