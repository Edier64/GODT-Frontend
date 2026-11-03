<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import DynamicField from "../components/DynamicField.vue";
import { getApiError } from "../services/api";
import { documentCatalogService } from "../services/documentCatalog";
import { documentInstancesService } from "../services/documentInstances";
import { useDocumentInstancesController } from "../controllers/useDocumentInstancesController";
import { useDynamicFormController } from "../controllers/useDynamicFormController";
import type { DocumentInstance, TemplateVersion } from "../types/document-engine";

const route = useRoute();
const donorId = String(route.params.donorId);
const instanceId = String(route.params.instanceId);
const instance = ref<DocumentInstance | null>(null);
const version = ref<TemplateVersion | null>(null);
const loadError = ref("");
const saving = ref(false);
const message = ref("");
const controller = useDocumentInstancesController(donorId);
const form = ref<ReturnType<typeof useDynamicFormController> | null>(null);
const fields = computed<Record<string, string>>(() => form.value?.errors ?? {});

async function load() {
  try {
    instance.value = await documentInstancesService.get(instanceId);
    version.value = instance.value.templateVersion ?? null;
    if (!version.value) throw new Error("La instancia no incluye su versión de plantilla.");
    const currentForm = useDynamicFormController(version.value, instance.value.currentRevision?.responseData ?? {});
    currentForm.setProvenance(instance.value.currentRevision?.provenance ?? []);
    form.value = currentForm;
  } catch (reason) { loadError.value = getApiError(reason); }
}
async function save() {
  if (!form.value || !form.value.validate()) return;
  saving.value = true; message.value = "";
  const saved = await controller.save(instanceId, { responseData: form.value.values, sourceProvenance: form.value.provenance });
  saving.value = false;
  if (saved) message.value = "Revisión guardada correctamente.";
}
async function validateInstance() {
  const result = await controller.validate(instanceId);
  if (result) message.value = "Validación ejecutada. El estado final proviene del backend.";
}
onMounted(load);
</script>

<template>
  <section><RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/instancias`">← Volver a instancias</RouterLink><div class="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="text-sm font-semibold text-[#159c9a]">Formulario dinámico</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">{{ instance?.documentCode ?? "Instancia documental" }}</h2><p class="mt-2 text-sm text-[#6b8790]">La estructura se interpreta desde la versión exacta utilizada.</p></div><div class="flex items-center gap-2"><RouterLink v-if="instance" class="focus-ring rounded-lg border border-[#159c9a] px-3 py-2 text-xs font-semibold text-[#159c9a]" :to="`/expedientes/${donorId}/instancias/${instance.id}/revision`">Centro de revisión</RouterLink><span v-if="instance" class="rounded-full bg-[#edf4f6] px-3 py-2 text-xs font-semibold text-[#1e5575]">{{ instance.status }}</span></div></div>
    <p v-if="loadError" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ loadError }}</p>
    <div v-if="version && form" class="mt-8 rounded-2xl border border-[#dce6eb] bg-white p-5 sm:p-8"><div class="mb-7 border-b border-[#edf2f3] pb-5"><div class="flex items-start justify-between gap-3"><div><p class="text-xs text-[#789098]">Versión {{ version.versionNumber }}</p><p class="mt-1 text-sm text-[#49636b]">Los cambios crean una nueva revisión; el historial no se sobrescribe.</p></div><RouterLink v-if="instance" class="focus-ring rounded-lg border border-[#1e5575] px-3 py-2 text-xs font-semibold text-[#1e5575]" :to="`/expedientes/${donorId}/instancias/${instance.id}/finalizacion`">Revisión formal</RouterLink></div></div><div v-for="section in (version.uiSchema.sections ?? [{ id: 'main', fields: Object.keys(version.jsonSchema.properties ?? {}) }])" :key="section.id" class="mb-8"><h3 class="text-lg font-bold text-[#17313b]">{{ section.title ?? section.id }}</h3><p v-if="section.description" class="mt-1 text-sm text-[#789098]">{{ section.description }}</p><div class="mt-5 grid gap-5 md:grid-cols-2"><DynamicField v-for="key in (section.fields ?? Object.keys(version.jsonSchema.properties ?? {}))" :key="key" :name="`$.${key}`" :schema="version.jsonSchema.properties?.[key] ?? {}" :model-value="form.values[key]" :required="version.jsonSchema.required?.includes(key)" :errors="fields" :error="fields[`$.${key}`]" :ui="version.uiSchema.fieldConfigs?.[`$.${key}`]" :ui-schema="version.uiSchema" :dependency-config="version.dependencyConfig" :values="form.values" @update:model-value="form.values[key] = $event" /></div></div><div v-if="message" class="mb-4 rounded-xl bg-[#effaf6] p-3 text-sm text-[#18735e]">{{ message }}</div><p v-if="controller.error" class="mb-4 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#ad4039]">{{ controller.error }}</p><div class="flex flex-wrap justify-end gap-3"><button class="focus-ring rounded-lg border border-[#cbdce2] px-4 py-3 text-sm font-semibold text-[#1e5575]" :disabled="saving" @click="validateInstance">Validar instancia</button><button class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? "Guardando…" : "Guardar revisión" }}</button></div></div>
  </section>
</template>
