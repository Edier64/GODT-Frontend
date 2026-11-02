<script setup lang="ts">
import type { DocumentRevision } from "../types/document-engine";
defineProps<{ revisions: DocumentRevision[]; selectedIds: string[]; formatDate: (value: string | null | undefined) => string }>();
const emit = defineEmits<{ toggle: [id: string] }>();
</script>

<template>
  <div class="rounded-2xl border border-[#dce6eb] bg-white p-5">
    <div class="flex items-center justify-between gap-3"><div><h3 class="font-bold text-[#17313b]">Historial append-only</h3><p class="mt-1 text-xs text-[#789098]">Selecciona hasta dos revisiones para compararlas.</p></div><span class="text-xs text-[#789098]">{{ revisions.length }} revisión(es)</span></div>
    <div v-if="!revisions.length" class="mt-6 rounded-xl bg-[#f5f7fa] p-5 text-center text-sm text-[#789098]">No hay revisiones disponibles.</div>
    <div v-else class="mt-4 space-y-2">
      <button v-for="revision in revisions" :key="revision.id" type="button" class="focus-ring flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition" :class="selectedIds.includes(revision.id) ? 'border-[#159c9a] bg-[#effaf6]' : 'border-[#edf2f3] hover:border-[#b8d8d8]'" @click="emit('toggle', revision.id)">
        <span><span class="block text-sm font-bold text-[#17313b]">Revisión #{{ revision.revisionNumber }}</span><span class="mt-1 block text-xs text-[#789098]">{{ formatDate(revision.createdAt) }} · Autor: {{ revision.createdById ?? "No disponible" }}</span></span>
        <span class="rounded-full px-2.5 py-1 text-[10px] font-bold" :class="revision.validationSummary?.valid ? 'bg-[#e6f7f4] text-[#17817d]' : 'bg-[#fff8e6] text-[#856800]'">{{ revision.validationSummary?.valid ? "Válida" : "Borrador" }}</span>
      </button>
    </div>
  </div>
</template>
