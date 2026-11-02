<script setup lang="ts">
import type { DocumentRevision, DocumentProvenance } from "../types/document-engine";
defineProps<{ revisions: DocumentRevision[]; formatDate: (value: string | null | undefined) => string }>();
function sourceLabel(source: DocumentProvenance) {
  return { MANUAL: "Manual", DONOR_RECORD: "Registro canónico", SOURCE_DOCUMENT: "Documento fuente", OCR_CONFIRMED: "OCR confirmado", OCR_MODIFIED: "OCR modificado", CALCULATED: "Calculado" }[source.sourceKind] ?? source.sourceKind;
}
</script>

<template>
  <div class="rounded-2xl border border-[#dce6eb] bg-white p-5">
    <h3 class="font-bold text-[#17313b]">Proveniencia y conflictos</h3>
    <div v-if="!revisions.some((revision) => revision.provenance?.length)" class="mt-5 rounded-xl bg-[#f5f7fa] p-5 text-center text-sm text-[#789098]">Esta instancia no tiene proveniencia disponible.</div>
    <div v-else class="mt-4 space-y-4">
      <div v-for="revision in revisions" :key="revision.id">
        <p class="text-xs font-bold uppercase tracking-wide text-[#159c9a]">Revisión #{{ revision.revisionNumber }}</p>
        <div class="mt-2 space-y-2">
          <div v-for="source in revision.provenance" :key="source.id ?? `${revision.id}-${source.fieldPath}`" class="rounded-xl border p-3" :class="source.conflictStatus === 'PENDING' ? 'border-[#efc5c1] bg-[#fffaf9]' : 'border-[#edf2f3]'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-semibold text-[#17313b]">{{ source.fieldPath }}</span>
              <span class="rounded-full bg-[#edf4f6] px-2 py-1 text-[10px] font-bold text-[#1e5575]">{{ sourceLabel(source) }}</span>
            </div>
            <p class="mt-2 text-xs text-[#789098]">Valor de origen: {{ source.sourceValue === undefined ? "No disponible" : JSON.stringify(source.sourceValue) }}</p>
            <p v-if="source.validatedAt" class="mt-1 text-xs text-[#789098]">Validado: {{ formatDate(source.validatedAt) }} · {{ source.validatedById ?? "Usuario no disponible" }}</p>
            <p v-if="source.conflictStatus === 'PENDING'" class="mt-2 text-xs font-semibold text-[#ad4039]">Conflicto pendiente de resolución</p>
            <p v-else-if="source.conflictStatus === 'RESOLVED'" class="mt-2 text-xs font-semibold text-[#18735e]">Conflicto resuelto: {{ source.conflictDecision ?? "Decisión registrada" }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
