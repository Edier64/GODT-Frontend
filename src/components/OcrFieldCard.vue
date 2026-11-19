<script setup lang="ts">
import { computed } from "vue";
import type { OcrField, OcrValidationStatus } from "../types/ocr";

const props = defineProps<{ field: OcrField; formatDate: (value: string | null) => string }>();
const emit = defineEmits<{ validate: [field: OcrField] }>();
const labels: Record<OcrValidationStatus, string> = {
  PENDIENTE: "Pendiente de revisión",
  CONFIRMADO: "Confirmado",
  MODIFICADO: "Modificado",
  RECHAZADO: "Rechazado"
};

const confidence = computed(() => Math.round(Number(props.field.confidenceScore) * 100));
const isDoubtful = computed(() => confidence.value < 85 && props.field.validationStatus === "PENDIENTE");

const engineInfo = computed(() => {
  const box = props.field.boundingBox as Record<string, unknown> | null;
  const engine = box?.engine as string | undefined;
  if (engine === "GEMINI_AI") {
    return {
      name: "Gemini AI",
      model: (box?.model as string) || "Gemini Multimodal",
      isAi: true,
      badgeClass: "bg-purple-100 text-purple-800 border-purple-200"
    };
  }
  if (engine === "LOCAL_RULES_FALLBACK") {
    return {
      name: "Reglas Locales",
      model: "Expresiones Regulares R3 (Fallback)",
      isAi: false,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200"
    };
  }
  if (engine === "LOCAL_OCR_FALLBACK") {
    return {
      name: "OCR Local",
      model: "Tesseract OCR (Fallback)",
      isAi: false,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
    };
  }
  return {
    name: "Extracción Automática",
    model: "Motor GODT",
    isAi: false,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
  };
});

const snippet = computed(() => {
  const box = props.field.boundingBox as Record<string, unknown> | null;
  return (box?.snippet as string) || null;
});
</script>

<template>
  <article class="rounded-xl border p-4 shadow-2xs" :class="{
    'border-[#e4d39b] bg-[#fffdf7]': field.validationStatus === 'PENDIENTE',
    'border-[#b9e2d7] bg-[#f7fcfa]': field.validationStatus === 'CONFIRMADO',
    'border-[#bcd9e8] bg-[#f7fbfd]': field.validationStatus === 'MODIFICADO',
    'border-[#efc5c1] bg-[#fff8f7]': field.validationStatus === 'RECHAZADO'
  }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-[#789098] font-mono">{{ field.canonicalFieldKey }}</p>
          <span class="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold" :class="engineInfo.badgeClass">
            <span class="mr-1">{{ engineInfo.isAi ? '✨' : '⚙️' }}</span>{{ engineInfo.name }}
          </span>
          <span v-if="isDoubtful" class="inline-flex items-center rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            ⚠️ Valor dudoso
          </span>
        </div>
        <p class="mt-2 break-words text-sm font-semibold text-[#17313b]">{{ field.validationStatus === "MODIFICADO" ? field.confirmedValue : field.candidateValue }}</p>
        <p v-if="snippet" class="mt-1 text-[11px] text-[#6b8790] italic">
          Evidencia: "{{ snippet }}"
        </p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" :class="{
        'bg-[#fff0c8] text-[#856800]': field.validationStatus === 'PENDIENTE',
        'bg-[#dff5ee] text-[#18735e]': field.validationStatus === 'CONFIRMADO',
        'bg-[#e2f0f7] text-[#21617d]': field.validationStatus === 'MODIFICADO',
        'bg-[#ffe5e2] text-[#ad4039]': field.validationStatus === 'RECHAZADO'
      }">{{ labels[field.validationStatus] }}</span>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f4f6] pt-2 text-[11px] text-[#789098]">
      <span>Confianza: <strong :class="confidence < 85 ? 'text-amber-700' : 'text-emerald-700'">{{ confidence }}%</strong></span>
      <span v-if="field.validatedAt">Validado: {{ formatDate(field.validatedAt) }}</span>
      <span class="text-[10px] text-slate-400">Motor: {{ engineInfo.model }}</span>
    </div>
    <button v-if="field.validationStatus === 'PENDIENTE'" class="focus-ring mt-4 w-full rounded-lg bg-[#123047] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e5575] transition" @click="emit('validate', field)">Revisar y validar</button>
    <p v-else class="mt-4 text-[11px] text-[#789098]">Este valor ya no está pendiente de validación.</p>
  </article>
</template>
