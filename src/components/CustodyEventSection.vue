<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { documentLifecycleService } from "../services/documentLifecycle";
import type { CustodyEvent, CustodyStage } from "../types/document-lifecycle";

const props = defineProps<{
  instanceId: string;
}>();

const events = ref<CustodyEvent[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const showAddModal = ref(false);

const stages: { value: CustodyStage; label: string }[] = [
  { value: "INSPECCION_INICIAL", label: "Inspección Inicial" },
  { value: "EMBALAJE_PRIMARIO", label: "Embalaje Primario" },
  { value: "ROTULADO", label: "Rotulado Oficial" },
  { value: "SELLADO_TERMICO", label: "Sellado Térmico / Contenedor" },
  { value: "CONTROL_TEMPERATURA", label: "Control de Temperatura" },
  { value: "DESPACHO", label: "Despacho desde IPS Extractora" },
  { value: "TRANSPORTE", label: "Custodia en Transporte" },
  { value: "RECEPCION", label: "Recepción en IPS Trasplantadora / Banco" },
  { value: "VERIFICACION_INTEGRIDAD", label: "Verificación Final de Integridad" },
];

const form = reactive({
  stage: "DESPACHO" as CustodyStage,
  responsibleName: "",
  responsibleDocument: "",
  responsibleRole: "COORDINADOR_OPERATIVO",
  institution: "",
  eventTimestamp: new Date().toISOString().slice(0, 16),
  temperatureCelsius: 4.0,
  containerSealNumber: "",
  integrityVerified: false,
  verifierNotes: "",
  notes: "",
});

async function loadEvents() {
  loading.value = true;
  error.value = null;
  try {
    events.value = await documentLifecycleService.listCustodyEvents(props.instanceId);
  } catch (err: any) {
    error.value = err?.message || "Error al cargar eventos de custodia.";
  } finally {
    loading.value = false;
  }
}

async function handleAppendEvent() {
  if (!form.responsibleName.trim() || !form.responsibleDocument.trim()) {
    error.value = "Nombre y documento del responsable son obligatorios.";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    await documentLifecycleService.appendCustodyEvent(props.instanceId, {
      stage: form.stage,
      responsibleName: form.responsibleName.trim(),
      responsibleDocument: form.responsibleDocument.trim(),
      responsibleRole: form.responsibleRole.trim(),
      institution: form.institution.trim() || "IPS Extractora Regional 3",
      eventTimestamp: new Date(form.eventTimestamp).toISOString(),
      temperatureCelsius: Number(form.temperatureCelsius),
      containerSealNumber: form.containerSealNumber.trim() || undefined,
      integrityVerified: form.integrityVerified,
      verifierNotes: form.verifierNotes.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });

    showAddModal.value = false;
    form.containerSealNumber = "";
    form.verifierNotes = "";
    form.notes = "";
    await loadEvents();
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || err?.message || "Error al registrar evento de custodia.";
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadEvents();
});
</script>

<template>
  <div class="mt-8 rounded-2xl border border-teal-200 bg-white p-6 shadow-xs space-y-4">
    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🧊</span>
        <div>
          <h3 class="text-base font-bold text-slate-800">
            Cadena de Custodia de Órganos y Tejidos (Anexo 8)
          </h3>
          <p class="text-xs text-slate-500">
            Libro de eventos inmutable cronológico con verificación de temperatura, sellos y trazabilidad estricta.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 cursor-pointer shadow-xs"
        @click="showAddModal = true"
      >
        <span>+</span>
        <span>Registrar Eslabón de Custodia</span>
      </button>
    </div>

    <div v-if="error" class="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
      {{ error }}
    </div>

    <!-- Tabla de eventos cronológicos -->
    <div v-if="loading" class="py-6 text-center text-xs text-slate-400">
      Cargando eventos de custodia...
    </div>
    <div
      v-else-if="events.length === 0"
      class="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500"
    >
      No se han registrado eventos en la cadena de custodia aún. Registre el eslabón de embalaje o despacho.
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-xs text-slate-700">
        <thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th class="px-3 py-2.5">Sec.</th>
            <th class="px-3 py-2.5">Etapa</th>
            <th class="px-3 py-2.5">Fecha y Hora</th>
            <th class="px-3 py-2.5">Responsable</th>
            <th class="px-3 py-2.5">Institución</th>
            <th class="px-3 py-2.5">Temp (°C)</th>
            <th class="px-3 py-2.5">Sello</th>
            <th class="px-3 py-2.5">Integridad</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="ev in events" :key="ev.id" class="hover:bg-slate-50/50">
            <td class="px-3 py-2.5 font-bold font-mono text-teal-800">#{{ ev.sequenceNumber }}</td>
            <td class="px-3 py-2.5 font-semibold text-slate-800">{{ ev.stage }}</td>
            <td class="px-3 py-2.5">{{ new Date(ev.eventTimestamp).toLocaleString() }}</td>
            <td class="px-3 py-2.5">
              <span class="font-medium text-slate-800">{{ ev.responsibleName }}</span>
              <span class="block text-[11px] text-slate-400">{{ ev.responsibleRole }} · {{ ev.responsibleDocument }}</span>
            </td>
            <td class="px-3 py-2.5 text-slate-600">{{ ev.institution }}</td>
            <td class="px-3 py-2.5 font-mono">
              <span
                class="rounded px-1.5 py-0.5 text-[11px] font-bold"
                :class="
                  ev.temperatureCelsius !== null && ev.temperatureCelsius !== undefined && ev.temperatureCelsius <= 4
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                {{ ev.temperatureCelsius !== null && ev.temperatureCelsius !== undefined ? `${ev.temperatureCelsius} °C` : 'N/A' }}
              </span>
            </td>
            <td class="px-3 py-2.5 font-mono text-slate-600">
              {{ ev.containerSealNumber || '—' }}
            </td>
            <td class="px-3 py-2.5">
              <span
                class="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                :class="
                  ev.integrityVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                {{ ev.integrityVerified ? '✓ Verificado' : 'Pendiente' }}
              </span>
              <span
                v-if="ev.verifiedBy || ev.verifiedAt"
                class="block text-[10px] text-slate-400 mt-0.5 font-normal"
              >
                {{ ev.verifiedBy?.fullName ? `por ${ev.verifiedBy.fullName}` : 'Verificado' }}
                {{ ev.verifiedAt ? `(${new Date(ev.verifiedAt).toLocaleDateString()})` : '' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Agregar Evento de Custodia -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
      @click.self="showAddModal = false"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 class="text-base font-bold text-slate-800">
            Registrar Eslabón de Cadena de Custodia
          </h3>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-200"
            @click="showAddModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="col-span-2">
              <label class="block font-semibold text-slate-700 mb-1">Etapa de la Cadena *</label>
              <select
                v-model="form.stage"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option v-for="s in stages" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block font-semibold text-slate-700 mb-1">Responsable *</label>
              <input
                v-model="form.responsibleName"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder="Nombre completo"
              />
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block font-semibold text-slate-700 mb-1">Cédula / Documento *</label>
              <input
                v-model="form.responsibleDocument"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder="1098765432"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Rol Operativo</label>
              <input
                v-model="form.responsibleRole"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Institución</label>
              <input
                v-model="form.institution"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder="IPS u Operador Logístico"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Fecha y Hora Evento *</label>
              <input
                v-model="form.eventTimestamp"
                type="datetime-local"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Temperatura (°C)</label>
              <input
                v-model="form.temperatureCelsius"
                type="number"
                step="0.1"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block font-semibold text-slate-700 mb-1">Número de Sello / Precinto</label>
              <input
                v-model="form.containerSealNumber"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder="Ej: SEAL-2026-99"
              />
            </div>

            <div class="col-span-2 sm:col-span-1 flex items-center gap-2 pt-5">
              <input
                id="intVer"
                v-model="form.integrityVerified"
                type="checkbox"
                class="h-4 w-4 rounded text-teal-600"
              />
              <label for="intVer" class="text-xs font-semibold text-slate-700 cursor-pointer">
                Integridad física y cadena de frío verificadas
              </label>
            </div>

            <div v-if="form.integrityVerified" class="col-span-2">
              <label class="block font-semibold text-teal-800 mb-1">
                Notas y Constancia del Verificador de Integridad *
              </label>
              <input
                v-model="form.verifierNotes"
                type="text"
                class="w-full rounded-lg border border-teal-300 bg-teal-50/40 px-3 py-2 text-xs text-slate-800"
                placeholder="Ej: Contenedor con precinto intacto y temperatura conforme al desembalaje"
              />
            </div>

            <div class="col-span-2">
              <label class="block font-semibold text-slate-700 mb-1">Observaciones</label>
              <textarea
                v-model="form.notes"
                rows="2"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder="Novedades, condición del embalaje o refrigeración..."
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            @click="showAddModal = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            :disabled="saving"
            @click="handleAppendEvent"
          >
            {{ saving ? "Registrando..." : "Registrar Eslabón" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
