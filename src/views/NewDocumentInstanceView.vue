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
    if (!version.value) error.value = "La versión solicitada no está disponible.";
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
  <section><RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/instancias`">← Volver a instancias</RouterLink><p class="mt-5 text-sm font-semibold text-[#159c9a]">Nueva instancia</p><div class="mt-1 flex flex-wrap items-center gap-3"><h2 class="text-3xl font-bold tracking-tight text-[#17313b]">{{ version?.jsonSchema.title ?? "Diligenciamiento documental" }}</h2><span v-if="version" class="rounded-full bg-[#fff8e6] px-2.5 py-1 text-xs font-bold text-[#8a6418]">v{{ version.versionNumber }} · {{ version.status }}</span></div><p class="mt-2 text-sm text-[#6b8790]">Los campos se generan desde la definición recibida del backend.</p>
    <p v-if="error || controller.error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error || controller.error }}</p>
    <div v-if="version && form" class="mt-8 rounded-2xl border border-[#dce6eb] bg-white p-5 sm:p-8"><div v-for="section in (version.uiSchema.sections ?? [{ id: 'main', fields: Object.keys(version.jsonSchema.properties ?? {}) }])" :key="section.id" class="mb-8"><h3 class="text-lg font-bold text-[#17313b]">{{ section.title ?? section.id }}</h3><p v-if="section.description" class="mt-1 text-sm text-[#789098]">{{ section.description }}</p><div class="mt-5 grid gap-5 md:grid-cols-2"><DynamicField v-for="key in (section.fields ?? Object.keys(version.jsonSchema.properties ?? {}))" :key="key" :name="`$.${key}`" :schema="version.jsonSchema.properties?.[key] ?? {}" :model-value="form.values[key]" :required="version.jsonSchema.required?.includes(key)" :errors="form.errors" :error="form.errors[`$.${key}`]" :ui="version.uiSchema.fieldConfigs?.[`$.${key}`]" :ui-schema="version.uiSchema" :dependency-config="version.dependencyConfig" :values="form.values" @update:model-value="form.values[key] = $event" /></div></div><div class="mt-8 flex justify-end"><button class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving" @click="create">{{ saving ? "Creando…" : "Crear instancia" }}</button></div></div>
  </section>
</template>
