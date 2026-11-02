<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import DynamicField from "../components/DynamicField.vue";
import { getApiError } from "../services/api";
import { documentCatalogService } from "../services/documentCatalog";
import { useDocumentInstancesController } from "../controllers/useDocumentInstancesController";
import { useDynamicFormController } from "../controllers/useDynamicFormController";
import type { TemplateVersion } from "../types/document-engine";

const route = useRoute();
const router = useRouter();
const donorId = String(route.params.donorId);
const versionId = String(route.params.templateVersionId);
const version = ref<TemplateVersion | null>(null);
const error = ref("");
const saving = ref(false);
const controller = useDocumentInstancesController(donorId);
const form = ref<ReturnType<typeof useDynamicFormController> | null>(null);

async function load() {
  try {
    const templates = await documentCatalogService.list();
    version.value = templates.flatMap((template) => template.versions).find((candidate) => candidate.id === versionId) ?? null;
    if (!version.value || version.value.status !== "PUBLISHED") error.value = "La versión solicitada no está publicada o no está disponible.";
    else form.value = useDynamicFormController(version.value);
  } catch (reason) { error.value = getApiError(reason); }
}
async function create() {
  if (!form.value || !version.value || !form.value.validate()) return;
  saving.value = true;
  const instance = await controller.create({ templateVersionId: version.value.id, responseData: form.value.values, sourceProvenance: form.value.provenance });
  saving.value = false;
  if (instance) await router.push(`/expedientes/${donorId}/instancias/${instance.id}`);
}
onMounted(load);
</script>

<template>
  <section><RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/instancias`">← Volver a instancias</RouterLink><p class="mt-5 text-sm font-semibold text-[#159c9a]">Nueva instancia</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">{{ version?.jsonSchema.title ?? "Diligenciamiento documental" }}</h2><p class="mt-2 text-sm text-[#6b8790]">Los campos se generan desde la versión publicada seleccionada.</p>
    <p v-if="error || controller.error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error || controller.error }}</p>
    <div v-if="version && form" class="mt-8 rounded-2xl border border-[#dce6eb] bg-white p-5 sm:p-8"><div class="grid gap-5 md:grid-cols-2"><DynamicField v-for="(schema, key) in version.jsonSchema.properties" :key="key" :name="`$.${key}`" :schema="schema" :model-value="form.values[key]" :required="version.jsonSchema.required?.includes(key)" :errors="form.errors" :error="form.errors[`$.${key}`]" @update:model-value="form.values[key] = $event" /></div><div class="mt-8 flex justify-end"><button class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving" @click="create">{{ saving ? "Creando…" : "Crear instancia" }}</button></div></div>
  </section>
</template>
