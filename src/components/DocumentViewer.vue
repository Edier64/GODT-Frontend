<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { api } from "../services/api";
import type { SourceDocument } from "../types/documents";

const props = defineProps<{ document: SourceDocument | null }>();
const previewUrl = ref("");
const loading = ref(false);
const error = ref("");

async function loadPreview(document: SourceDocument | null) {
  const requestedDocumentId = document?.id;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
  error.value = "";
  if (!document) return;
  loading.value = true;
  try {
    const { data } = await api.get<Blob>(`/documents/${document.id}/download`, { responseType: "blob" });
    if (requestedDocumentId !== props.document?.id) return;
    previewUrl.value = URL.createObjectURL(data);
  } catch {
    error.value = "No fue posible cargar la vista previa autorizada.";
  } finally {
    loading.value = false;
  }
}

watch(() => props.document, loadPreview, { immediate: true });
onBeforeUnmount(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); });
</script>

<template>
  <div class="flex min-h-[420px] items-center justify-center rounded-2xl bg-[#edf3f5] p-4">
    <div v-if="loading" class="w-full max-w-sm space-y-3"><div class="h-4 animate-pulse rounded bg-white/70" /><div class="h-72 animate-pulse rounded-xl bg-white/70" /></div>
    <p v-else-if="error" class="max-w-xs text-center text-sm text-[#ad4039]">{{ error }}</p>
    <iframe v-else-if="previewUrl && document?.mimeType === 'application/pdf'" class="h-[520px] w-full rounded-xl bg-white" :src="previewUrl" title="Vista previa del documento PDF" />
    <img v-else-if="previewUrl" class="max-h-[520px] max-w-full rounded-xl object-contain shadow-sm" :src="previewUrl" alt="Vista previa del documento" />
    <p v-else class="text-center text-sm text-[#789098]">Selecciona un documento para visualizarlo.</p>
  </div>
</template>
