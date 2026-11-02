<script setup lang="ts">
import type { OcrField, OcrValidationStatus } from "../types/ocr";

defineProps<{ field: OcrField; formatDate: (value: string | null) => string }>();
const emit = defineEmits<{ validate: [field: OcrField] }>();
const labels: Record<OcrValidationStatus, string> = {
  PENDIENTE: "Pendiente de revisión",
  CONFIRMADO: "Confirmado",
  MODIFICADO: "Modificado",
  RECHAZADO: "Rechazado"
};
</script>

<template>
  <article class="rounded-xl border p-4" :class="{
    'border-[#e4d39b] bg-[#fffdf7]': field.validationStatus === 'PENDIENTE',
    'border-[#b9e2d7] bg-[#f7fcfa]': field.validationStatus === 'CONFIRMADO',
    'border-[#bcd9e8] bg-[#f7fbfd]': field.validationStatus === 'MODIFICADO',
    'border-[#efc5c1] bg-[#fff8f7]': field.validationStatus === 'RECHAZADO'
  }">
    <div class="flex items-start justify-between gap-3">
      <div><p class="text-xs font-semibold uppercase tracking-wide text-[#789098]">{{ field.canonicalFieldKey }}</p><p class="mt-2 break-words text-sm font-semibold text-[#17313b]">{{ field.validationStatus === "MODIFICADO" ? field.confirmedValue : field.candidateValue }}</p></div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" :class="{
        'bg-[#fff0c8] text-[#856800]': field.validationStatus === 'PENDIENTE',
        'bg-[#dff5ee] text-[#18735e]': field.validationStatus === 'CONFIRMADO',
        'bg-[#e2f0f7] text-[#21617d]': field.validationStatus === 'MODIFICADO',
        'bg-[#ffe5e2] text-[#ad4039]': field.validationStatus === 'RECHAZADO'
      }">{{ labels[field.validationStatus] }}</span>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#789098]">
      <span>Confianza: {{ Math.round(Number(field.confidenceScore) * 100) }}%</span>
      <span v-if="field.validatedAt">Validado: {{ formatDate(field.validatedAt) }}</span>
    </div>
    <button v-if="field.validationStatus === 'PENDIENTE'" class="focus-ring mt-4 w-full rounded-lg bg-[#123047] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e5575]" @click="emit('validate', field)">Revisar y validar</button>
    <p v-else class="mt-4 text-[11px] text-[#789098]">Este valor ya no está pendiente de validación.</p>
  </article>
</template>
