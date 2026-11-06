<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../components/AppLayout.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { useDonationProcessController } from "../controllers/useDonationProcessController";
import { useDonorsStore } from "../stores/donors";
import type { Donor } from "../types/donors";

const router = useRouter();
const {
  processes,
  loading,
  error,
  loadProcesses,
  openProcess,
} = useDonationProcessController();

const donorsStore = useDonorsStore();

const filterStatus = ref<string>("");
const showModal = ref(false);

const form = reactive({
  donorId: "",
  primaryIpsName: "",
  processCode: "",
  notes: "",
});

onMounted(async () => {
  await Promise.all([
    loadProcesses(),
    donorsStore.fetch({ page: 1, pageSize: 50 }),
  ]);
});

async function handleFilter() {
  await loadProcesses({
    status: filterStatus.value || undefined,
  });
}

function openCreateModal() {
  form.donorId = "";
  form.primaryIpsName = "";
  form.processCode = "";
  form.notes = "";
  showModal.value = true;
}

function onDonorChange() {
  const selected = donorsStore.page.items.find((d: Donor) => d.id === form.donorId);
  if (selected && !form.primaryIpsName) {
    form.primaryIpsName = selected.originatingIpsName;
  }
}

async function handleCreate() {
  if (!form.donorId || !form.primaryIpsName) return;

  const result = await openProcess({
    donorId: form.donorId,
    primaryIpsName: form.primaryIpsName,
    processCode: form.processCode.trim() || undefined,
    notes: form.notes.trim() || undefined,
  });

  if (result) {
    showModal.value = false;
    router.push(`/procesos/${result.id}`);
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Procesos de Donación</h1>
          <p class="text-sm text-slate-500">
            Gestión de operativos de donación, rescate y coordinación regional
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-sm font-medium transition cursor-pointer"
          @click="openCreateModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Abrir Nuevo Proceso
        </button>
      </div>

      <!-- Filtros -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado:</label>
          <select
            v-model="filterStatus"
            class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            @change="handleFilter"
          >
            <option value="">Todos los estados</option>
            <option value="EN_VALORACION">En Valoración</option>
            <option value="EN_CURSO">En Curso</option>
            <option value="COMPLETADO">Completado</option>
            <option value="SUSPENDIDO">Suspendido</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      <!-- Alerta de Error -->
      <div v-if="error" class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
        {{ error }}
      </div>

      <!-- Tabla de Procesos -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div v-if="loading && !processes.length" class="p-8 text-center text-slate-400 text-sm">
          Cargando procesos de donación...
        </div>

        <div v-else-if="!processes.length" class="p-12 text-center text-slate-400 space-y-2">
          <svg class="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="font-medium text-slate-600">No se encontraron procesos de donación</p>
          <p class="text-xs">Inicie un proceso operativo seleccionando un donante existente.</p>
        </div>

        <table v-else class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider text-left">
            <tr>
              <th class="px-6 py-3.5">Código Acción</th>
              <th class="px-6 py-3.5">Donante</th>
              <th class="px-6 py-3.5">IPS Principal</th>
              <th class="px-6 py-3.5">Estado</th>
              <th class="px-6 py-3.5">Fecha Apertura</th>
              <th class="px-6 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 divide-solid">
            <tr
              v-for="proc in processes"
              :key="proc.id"
              class="hover:bg-slate-50/80 transition cursor-pointer"
              @click="router.push(`/procesos/${proc.id}`)"
            >
              <td class="px-6 py-4 font-mono font-bold text-indigo-600">
                {{ proc.processCode }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{{ proc.donor?.fullName || "Donante no asignado" }}</div>
                <div class="text-xs text-slate-500 font-mono">{{ proc.donor?.rndCode || proc.donorId }}</div>
              </td>
              <td class="px-6 py-4 text-slate-700">
                {{ proc.primaryIpsName }}
              </td>
              <td class="px-6 py-4">
                <StatusBadge :status="proc.status" />
              </td>
              <td class="px-6 py-4 text-xs text-slate-500">
                {{ formatDate(proc.openedAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  @click.stop="router.push(`/procesos/${proc.id}`)"
                >
                  Gestionar
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal Apertura Proceso -->
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-800">Apertura de Proceso Operativo</h2>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 text-sm"
              @click="showModal = false"
            >
              ✕
            </button>
          </div>

          <form class="p-6 space-y-4" @submit.prevent="handleCreate">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Donante Asociado *
              </label>
              <select
                v-model="form.donorId"
                required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                @change="onDonorChange"
              >
                <option value="" disabled>Seleccione un donante...</option>
                <option v-for="d in donorsStore.page.items" :key="d.id" :value="d.id">
                  {{ d.fullName }} — {{ d.rndCode }} ({{ d.originatingIpsName }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
                IPS Principal del Operativo *
              </label>
              <input
                v-model="form.primaryIpsName"
                type="text"
                required
                placeholder="Ej. Hospital Universitario del Valle"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Código de Operativo (Opcional)
              </label>
              <input
                v-model="form.processCode"
                type="text"
                placeholder="Dejar vacío para generar PROC-2026-XXXX"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Observaciones de Apertura
              </label>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Observaciones iniciales del operativo de donación..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                @click="showModal = false"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50"
              >
                {{ loading ? "Abriendo..." : "Aperturar Proceso" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
