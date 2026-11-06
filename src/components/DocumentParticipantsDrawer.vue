<script setup lang="ts">
import { reactive, ref } from "vue";
import { documentLifecycleService } from "../services/documentLifecycle";
import type {
  AssignParticipantPayload,
  DocumentParticipant,
  DocumentParticipantRole,
} from "../types/document-lifecycle";

const props = defineProps<{
  instanceId: string;
  participants: DocumentParticipant[];
  isLocked: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated"): void;
}>();

const saving = ref(false);
const error = ref<string | null>(null);

const form = reactive<AssignParticipantPayload>({
  role: "CIRUJANO_RESCATE",
  fullName: "",
  documentType: "CC",
  documentNumber: "",
  professionalId: "",
  institution: "",
  requiresSignature: true,
  notes: "",
});

const roles: { value: DocumentParticipantRole; label: string }[] = [
  { value: "CIRUJANO_RESCATE", label: "Cirujano de Rescate" },
  { value: "COORDINADOR_OPERATIVO", label: "Coordinador Operativo de Donación" },
  { value: "MEDICO_TRATANTE", label: "Médico Tratante / Intensivista" },
  { value: "PATOLOGO", label: "Patólogo / Profesional de Banco" },
  { value: "TESTIGO", label: "Testigo / Familiar Acompañante" },
  { value: "ENTREGADOR_CUSTODIA", label: "Responsable Entregador de Custodia" },
  { value: "RECEPTOR_CUSTODIA", label: "Responsable Receptor de Custodia" },
];

async function handleAddParticipant() {
  if (!form.fullName.trim() || !form.documentNumber.trim()) {
    error.value = "Nombre completo y número de documento son obligatorios.";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    await documentLifecycleService.assignParticipant(props.instanceId, {
      role: form.role,
      fullName: form.fullName.trim(),
      documentType: form.documentType,
      documentNumber: form.documentNumber.trim(),
      professionalId: form.professionalId?.trim() || undefined,
      institution: form.institution?.trim() || undefined,
      requiresSignature: form.requiresSignature,
      notes: form.notes?.trim() || undefined,
    });

    // Reset form
    form.fullName = "";
    form.documentNumber = "";
    form.professionalId = "";
    form.notes = "";

    emit("updated");
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || err?.message || "Error al asignar participante.";
  } finally {
    saving.value = false;
  }
}

async function handleRemoveParticipant(id: string) {
  if (!confirm("¿Está seguro de remover este participante del documento?")) return;

  saving.value = true;
  error.value = null;

  try {
    await documentLifecycleService.removeParticipant(props.instanceId, id);
    emit("updated");
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || err?.message || "Error al eliminar participante.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      class="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 text-xl font-bold"
          >
            👥
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">
              Participantes Asignados al Documento
            </h3>
            <p class="text-xs text-slate-500">
              Gestione los intervinientes clínicos, roles y signatarios obligatorios.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Contenido -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <div v-if="error" class="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          {{ error }}
        </div>

        <!-- Lista de participantes actuales -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Participantes Registrados ({{ participants.length }})
          </h4>

          <div
            v-if="participants.length === 0"
            class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500"
          >
            No hay participantes asignados específicamente a este documento.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="p in participants"
              :key="p.id"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-800">{{ p.fullName }}</span>
                  <span
                    class="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                    :class="
                      p.requiresSignature
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    "
                  >
                    {{ p.requiresSignature ? 'Firma Requerida' : 'Informativo' }}
                  </span>
                </div>
                <p class="text-slate-600 mt-0.5">
                  <span class="font-semibold text-slate-700">{{ p.role }}</span> · {{ p.documentType }} {{ p.documentNumber }}
                  <span v-if="p.professionalId">· RM: {{ p.professionalId }}</span>
                  <span v-if="p.institution">· {{ p.institution }}</span>
                </p>
                <p v-if="p.notes" class="text-slate-500 italic mt-0.5 text-[11px]">
                  Nota: {{ p.notes }}
                </p>
              </div>

              <button
                v-if="!isLocked"
                type="button"
                class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold"
                title="Remover participante"
                @click="handleRemoveParticipant(p.id)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Formulario para agregar participante (solo si no está bloqueado) -->
        <div v-if="!isLocked" class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">
            Asignar Nuevo Participante
          </h4>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="col-span-2 sm:col-span-1">
              <label class="block font-semibold text-slate-700 mb-1">Rol en el Documento *</label>
              <select
                v-model="form.role"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option v-for="r in roles" :key="r.value" :value="r.value">
                  {{ r.label }}
                </option>
              </select>
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                v-model="form.fullName"
                type="text"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                placeholder="Ej: Dra. María Gómez"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tipo Documento</label>
              <select
                v-model="form.documentType"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Número Documento *</label>
              <input
                v-model="form.documentNumber"
                type="text"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                placeholder="1098765432"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Registro Médico / Tarjeta</label>
              <input
                v-model="form.professionalId"
                type="text"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                placeholder="RM-44920"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Institución Perteneciente</label>
              <input
                v-model="form.institution"
                type="text"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                placeholder="Hospital Universitario"
              />
            </div>

            <div class="col-span-2 flex items-center gap-2 pt-1">
              <input
                id="reqSig"
                v-model="form.requiresSignature"
                type="checkbox"
                class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="reqSig" class="text-xs font-semibold text-slate-700 cursor-pointer">
                Exigir firma obligatoria para la liberación de este documento
              </label>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              class="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              :disabled="saving"
              @click="handleAddParticipant"
            >
              {{ saving ? "Asignando..." : "+ Asignar Participante" }}
            </button>
          </div>
        </div>

        <div v-else class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          El documento está bloqueado para adición o remoción de participantes debido a su estado de ciclo de vida.
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
        <button
          type="button"
          class="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          @click="emit('close')"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
