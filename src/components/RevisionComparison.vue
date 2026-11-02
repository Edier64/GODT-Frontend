<script setup lang="ts">
import { computed } from "vue";
import type { DocumentRevision } from "../types/document-engine";
const props = defineProps<{ revisions: DocumentRevision[] }>();
const fields = computed(() => {
  const keys = new Set(props.revisions.flatMap((revision) => Object.keys(revision.responseData ?? {})));
  return [...keys].map((key) => ({ key, values: props.revisions.map((revision) => revision.responseData?.[key]) }));
});
function display(value: unknown) { return value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value); }
</script>

<template>
  <div class="rounded-2xl border border-[#dce6eb] bg-white p-5"><h3 class="font-bold text-[#17313b]">Comparación de revisiones</h3><p v-if="revisions.length < 2" class="mt-2 text-sm text-[#789098]">Selecciona dos revisiones para comparar sus respuestas sin modificar el historial.</p><div v-else class="mt-4 overflow-x-auto"><table class="w-full min-w-[560px] text-left text-sm"><thead><tr class="border-b border-[#edf2f3]"><th class="px-3 py-3 text-xs uppercase tracking-wide text-[#789098]">Campo</th><th v-for="revision in revisions" :key="revision.id" class="px-3 py-3 text-xs uppercase tracking-wide text-[#789098]">Revisión #{{ revision.revisionNumber }}</th></tr></thead><tbody><tr v-for="field in fields" :key="field.key" class="border-b border-[#f1f4f5] last:border-0"><td class="px-3 py-3 font-semibold text-[#49636b]">{{ field.key }}</td><td v-for="value in field.values" :key="`${field.key}-${String(value)}`" class="max-w-[260px] break-words px-3 py-3 text-[#17313b]">{{ display(value) }}</td></tr></tbody></table></div></div>
</template>
