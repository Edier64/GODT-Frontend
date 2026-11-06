<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import DynamicField from "../components/DynamicField.vue";
import { getApiError } from "../services/api";
import { documentInstancesService } from "../services/documentInstances";
import { useDocumentInstancesController } from "../controllers/useDocumentInstancesController";
import { useDynamicFormController } from "../controllers/useDynamicFormController";
import {
  applyCanonicalValueFromInstance,
  resolveCanonicalConflict,
} from "../services/canonical";
import type { DocumentInstance, TemplateVersion } from "../types/document-engine";
import type {
  CanonicalConflict,
  ConflictResolutionStrategy,
  PropagationResult,
} from "../types/canonical";

const route = useRoute();
const donorId = String(route.params.donorId);
const instanceId = String(route.params.instanceId);
const instance = ref<DocumentInstance | null>(null);
const version = ref<TemplateVersion | null>(null);
const loadError = ref("");
const saving = ref(false);
const message = ref("");
const propagationSuccessMessage = ref("");
const controller = useDocumentInstancesController(donorId);
const form = ref<ReturnType<typeof useDynamicFormController> | null>(null);
const fields = computed<Record<string, string>>(() => form.value?.errors ?? {});

// Estado de conflictos canónicos
const detectedConflicts = ref<CanonicalConflict[]>([]);
const currentConflict = ref<CanonicalConflict | null>(null);
const conflictModalOpen = ref(false);
const conflictForm = reactive({
  strategy: "ACCEPT_CANDIDATE" as ConflictResolutionStrategy,
  manualValue: "",
  justification: "",
});
const resolvingConflict = ref(false);

const mappedCanonicalFields = computed(() => {
  if (!version.value?.mappingConfig) return [];
  return version.value.mappingConfig.filter(
    (m) => m.canonicalFieldKey || m.targetKey,
  );
});

async function load() {
  try {
    instance.value = await documentInstancesService.get(instanceId);
    version.value = instance.value.templateVersion ?? null;
    if (!version.value) throw new Error("La instancia no incluye su versión de plantilla.");
    const currentForm = useDynamicFormController(
      version.value,
      instance.value.currentRevision?.responseData ?? {},
    );
    currentForm.setProvenance(instance.value.currentRevision?.provenance ?? []);
    form.value = currentForm;
  } catch (reason) {
    loadError.value = getApiError(reason);
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const cleanPath = path.replace(/^\$\./, "");
  const parts = cleanPath.split(".");
  let cur: any = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

async function save(propagate = true) {
  if (!form.value || !form.value.validate()) return;
  saving.value = true;
  message.value = "";
  propagationSuccessMessage.value = "";

  const saved = await controller.save(instanceId, {
    responseData: form.value.values,
    sourceProvenance: form.value.provenance,
  });

  if (!saved) {
    saving.value = false;
    return;
  }

  message.value = "Revisión guardada correctamente.";

  // Si se solicita propagar campos compartidos
  if (propagate && mappedCanonicalFields.value.length > 0) {
    const updatedDocs = new Set<string>();
    const allConflicts: CanonicalConflict[] = [];

    for (const mapping of mappedCanonicalFields.value) {
      const canonicalKey = mapping.canonicalFieldKey || mapping.targetKey;
      const fieldPath = mapping.schemaPath || mapping.targetKey;
      if (!canonicalKey || !fieldPath) continue;

      const value = getNestedValue(form.value.values, fieldPath);
      if (value === undefined || value === null || value === "") continue;

      try {
        const propRes: PropagationResult = await applyCanonicalValueFromInstance(
          instanceId,
          {
            canonicalFieldKey: canonicalKey,
            value,
            unit: mapping.unit,
            sourceKind: "MANUAL",
          },
        );

        if (propRes.propagatedInstances?.length) {
          propRes.propagatedInstances
            .filter((p) => p.status === "UPDATED")
            .forEach((p) => updatedDocs.add(p.documentCode));
        }

        if (propRes.conflicts?.length) {
          allConflicts.push(...propRes.conflicts);
        }
      } catch (err) {
        console.warn(`No se pudo propagar campo ${canonicalKey}:`, err);
      }
    }

    if (updatedDocs.size > 0) {
      propagationSuccessMessage.value = `Dato(s) compartidos propagados automáticamente a: ${Array.from(
        updatedDocs,
      ).join(", ")}.`;
    }

    if (allConflicts.length > 0) {
      detectedConflicts.value = allConflicts;
      currentConflict.value = allConflicts[0];
      conflictModalOpen.value = true;
    }
  }

  saving.value = false;
  // Recargar instancia para refrescar procedencias actualizadas
  await load();
}

async function handleResolveConflict() {
  if (!currentConflict.value || !instance.value?.processId) return;
  if (!conflictForm.justification.trim()) {
    alert("Se requiere una justificación clínica o administrativa para resolver el conflicto.");
    return;
  }

  resolvingConflict.value = true;
  try {
    const mapping = mappedCanonicalFields.value.find(
      (m) =>
        m.schemaPath === currentConflict.value?.fieldPath ||
        m.targetKey === currentConflict.value?.fieldPath,
    );
    const canonicalKey = mapping?.canonicalFieldKey || mapping?.targetKey || "";

    await resolveCanonicalConflict(instance.value.processId, {
      canonicalFieldKey: canonicalKey,
      strategy: conflictForm.strategy,
      manualValue:
        conflictForm.strategy === "MANUAL_OVERRIDE"
          ? conflictForm.manualValue
          : undefined,
      justification: conflictForm.justification.trim(),
    });

    conflictModalOpen.value = false;
    currentConflict.value = null;
    conflictForm.justification = "";
    conflictForm.manualValue = "";
    message.value = "Conflicto canónico resuelto satisfactoriamente.";
    await load();
  } catch (err) {
    alert(getApiError(err));
  } finally {
    resolvingConflict.value = false;
  }
}

async function validateInstance() {
  const result = await controller.validate(instanceId);
  if (result) message.value = "Validación ejecutada. El estado final proviene del backend.";
}

onMounted(load);
</script>

<template>
  <section class="max-w-6xl mx-auto pb-12">
    <RouterLink
      class="text-xs font-semibold text-[#159c9a] hover:underline"
      :to="`/expedientes/${donorId}/instancias`"
    >
      ← Volver a instancias
    </RouterLink>

    <div class="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="text-sm font-semibold text-[#159c9a]">Formulario dinámico</p>
        <h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">
          {{ instance?.documentCode ?? "Instancia documental" }}
        </h2>
        <p class="mt-2 text-sm text-[#6b8790]">
          La estructura se interpreta desde la versión exacta utilizada y sincroniza datos canónicos con el proceso.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink
          v-if="instance"
          class="focus-ring rounded-lg border border-[#159c9a] px-3 py-2 text-xs font-semibold text-[#159c9a]"
          :to="`/expedientes/${donorId}/instancias/${instance.id}/revision`"
        >
          Centro de revisión
        </RouterLink>
        <span
          v-if="instance"
          class="rounded-full bg-[#edf4f6] px-3 py-2 text-xs font-semibold text-[#1e5575]"
        >
          {{ instance.status }}
        </span>
      </div>
    </div>

    <!-- Banner informativo de Marcadores Canónicos Compartidos (Fase C) -->
    <div
      v-if="mappedCanonicalFields.length > 0"
      class="mt-4 p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3"
    >
      <span class="text-lg">🔄</span>
      <div class="space-y-1">
        <strong class="font-semibold text-teal-950">Marcadores Canónicos Compartidos Activos (Fase C):</strong>
        <p>
          Este anexo cuenta con {{ mappedCanonicalFields.length }} campo(s) sincronizado(s) con el expediente de donación. Los valores ingresados o modificados aquí se propagarán automáticamente a los demás anexos abiertos compatibles del proceso.
        </p>
      </div>
    </div>

    <p v-if="loadError" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">
      {{ loadError }}
    </p>

    <div v-if="version && form" class="mt-6 rounded-2xl border border-[#dce6eb] bg-white p-5 sm:p-8 shadow-xs">
      <div class="mb-7 border-b border-[#edf2f3] pb-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-[#789098]">Versión de Plantilla: {{ version.versionNumber }}</p>
            <p class="mt-1 text-sm text-[#49636b]">
              Los cambios crean una nueva revisión; el historial de respuestas y procedencia se auditan permanentemente.
            </p>
          </div>
          <RouterLink
            v-if="instance"
            class="focus-ring rounded-lg border border-[#1e5575] px-3 py-2 text-xs font-semibold text-[#1e5575]"
            :to="`/expedientes/${donorId}/instancias/${instance.id}/finalizacion`"
          >
            Revisión formal
          </RouterLink>
        </div>
      </div>

      <!-- Secciones dinámicas del formulario -->
      <div
        v-for="section in (version.uiSchema.sections ?? [{ id: 'main', fields: Object.keys(version.jsonSchema.properties ?? {}) }])"
        :key="section.id"
        class="mb-8"
      >
        <h3 class="text-lg font-bold text-[#17313b]">{{ section.title ?? section.id }}</h3>
        <p v-if="section.description" class="mt-1 text-sm text-[#789098]">
          {{ section.description }}
        </p>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <DynamicField
            v-for="key in (section.fields ?? Object.keys(version.jsonSchema.properties ?? {}))"
            :key="key"
            :name="`$.${key}`"
            :schema="version.jsonSchema.properties?.[key] ?? {}"
            :model-value="form.values[key]"
            :required="version.jsonSchema.required?.includes(key)"
            :errors="fields"
            :error="fields[`$.${key}`]"
            :ui="version.uiSchema.fieldConfigs?.[`$.${key}`]"
            :ui-schema="version.uiSchema"
            :dependency-config="version.dependencyConfig"
            :values="form.values"
            :mappings="version.mappingConfig"
            :provenance-list="instance?.currentRevision?.provenance ?? []"
            :process-id="instance?.processId ?? undefined"
            @update:model-value="form.values[key] = $event"
          />
        </div>
      </div>

      <!-- Feedback de Mensajes y Notificaciones de Propagación -->
      <div v-if="message" class="mb-4 rounded-xl bg-[#effaf6] p-3 text-sm text-[#18735e] flex items-center gap-2">
        <span>✓</span>
        <span>{{ message }}</span>
      </div>

      <div
        v-if="propagationSuccessMessage"
        class="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-sm text-teal-800 flex items-center gap-2 font-medium"
      >
        <span>🔄</span>
        <span>{{ propagationSuccessMessage }}</span>
      </div>

      <p v-if="controller.error" class="mb-4 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#ad4039]">
        {{ controller.error }}
      </p>

      <!-- Botones de Acción -->
      <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-[#edf2f3]">
        <button
          type="button"
          class="focus-ring rounded-lg border border-[#cbdce2] px-4 py-3 text-sm font-semibold text-[#1e5575] hover:bg-slate-50 cursor-pointer"
          :disabled="saving"
          @click="validateInstance"
        >
          Validar reglas
        </button>
        <button
          type="button"
          class="focus-ring rounded-lg border border-[#159c9a] bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-100 cursor-pointer disabled:opacity-50"
          :disabled="saving"
          @click="save(false)"
        >
          {{ saving ? "Guardando…" : "Guardar borrador local" }}
        </button>
        <button
          type="button"
          class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1a3f5c] cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-2"
          :disabled="saving"
          @click="save(true)"
        >
          <span>🔄</span>
          <span>{{ saving ? "Guardando y propagando…" : "Guardar y Propagar a otros Anexos" }}</span>
        </button>
      </div>
    </div>

    <!-- Modal de Resolución de Conflictos Canónicos (Fase C) -->
    <div
      v-if="conflictModalOpen && currentConflict"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
        <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              Divergencia / Conflicto Detectado
            </h3>
            <p class="text-xs text-slate-500">
              El documento de destino ya cuenta con un valor previo diferente.
            </p>
          </div>
        </div>

        <div class="space-y-2 bg-slate-50 p-4 rounded-xl text-xs text-slate-700">
          <p>
            <strong>Documento Destino:</strong>
            <span class="font-mono ml-1 text-indigo-700">{{ currentConflict.documentCode }}</span>
          </p>
          <p>
            <strong>Campo:</strong>
            <span class="font-mono ml-1">{{ currentConflict.fieldPath }}</span>
          </p>
          <p>
            <strong>Valor actual en destino:</strong>
            <span class="ml-1 text-rose-700 font-semibold">{{ String(currentConflict.existingValue) }}</span>
          </p>
          <p>
            <strong>Nuevo valor propuesto:</strong>
            <span class="ml-1 text-teal-700 font-semibold">{{ String(currentConflict.proposedValue) }}</span>
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-slate-700">Decisión de Resolución:</label>
          <div class="space-y-1.5 text-xs text-slate-800">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="conflictForm.strategy"
                type="radio"
                value="ACCEPT_CANDIDATE"
                class="text-indigo-600"
              />
              <span>Actualizar destino con el nuevo valor propuesto (Sobreescribir)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="conflictForm.strategy"
                type="radio"
                value="KEEP_CURRENT"
                class="text-indigo-600"
              />
              <span>Mantener valor local actual del documento (Conservar divergencia)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="conflictForm.strategy"
                type="radio"
                value="MANUAL_OVERRIDE"
                class="text-indigo-600"
              />
              <span>Ingresar valor manual arbitrario</span>
            </label>
          </div>
        </div>

        <div v-if="conflictForm.strategy === 'MANUAL_OVERRIDE'" class="space-y-1">
          <label class="block text-xs font-semibold text-slate-700">Valor Manual:</label>
          <input
            v-model="conflictForm.manualValue"
            type="text"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ingrese el valor consensuado"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-700">
            Justificación Clínica / Administrativa (Obligatoria):
          </label>
          <textarea
            v-model="conflictForm.justification"
            rows="3"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            placeholder="Describa el motivo clínico, verificación de identidad o soporte documental de esta resolución..."
          />
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            class="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            :disabled="resolvingConflict"
            @click="conflictModalOpen = false"
          >
            Posponer Resolución
          </button>
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
            :disabled="resolvingConflict"
            @click="handleResolveConflict"
          >
            {{ resolvingConflict ? "Aplicando resolución…" : "Confirmar Resolución" }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
