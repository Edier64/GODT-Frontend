<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import StatusBadge from "../components/StatusBadge.vue";
import { getDashboardSummary } from "../services/donationProcess";
import { getApiError } from "../services/api";
import type { DashboardSummary } from "../types/donation-process";

const summary = ref<DashboardSummary | null>(null);
const loading = ref(true);
const error = ref("");

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    summary.value = await getDashboardSummary();
  } catch (err) {
    error.value = getApiError(err);
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string | Date | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

onMounted(loadData);
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <!-- Hero Banner -->
    <div class="overflow-hidden rounded-3xl bg-[#123047] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#5ed1c8]">Tablero Regional 3 · Donación y Trasplantes</p>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Panel de Control Operativo</h1>
          <p class="mt-2 text-sm text-white/70 max-w-xl">
            Monitoreo en tiempo real de procesos de donación, expedientes maestros y trazabilidad de documentos clínicos.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            to="/procesos"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#159c9a] hover:bg-[#12807e] text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <span>+</span> Aperturar Proceso
          </RouterLink>
          <RouterLink
            to="/expedientes"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition"
          >
            Expedientes Maestros
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-sm text-rose-800 flex items-center justify-between">
      <div>
        <p class="font-bold">Error al cargar métricas del sistema</p>
        <p class="mt-1 text-xs">{{ error }}</p>
      </div>
      <button
        type="button"
        class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
        @click="loadData"
      >
        Reintentar
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-40 rounded-2xl bg-slate-100 animate-pulse border border-slate-200"></div>
    </div>

    <!-- Metrics Cards Grid -->
    <div v-else-if="summary" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Card 1: Procesos de Donación -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Procesos Operativos</span>
            <span class="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs font-bold">Activos</span>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-800">{{ summary.processes.total }}</span>
            <span class="text-xs text-slate-500">totales</span>
          </div>
          <div class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>En Valoración:</span>
              <span class="font-bold text-amber-600">{{ summary.processes.byStatus.EN_VALORACION }}</span>
            </div>
            <div class="flex justify-between">
              <span>En Curso:</span>
              <span class="font-bold text-indigo-600">{{ summary.processes.byStatus.EN_CURSO }}</span>
            </div>
            <div class="flex justify-between">
              <span>Completados:</span>
              <span class="font-bold text-emerald-600">{{ summary.processes.byStatus.COMPLETADO }}</span>
            </div>
          </div>
        </div>
        <RouterLink to="/procesos" class="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          Ver todos los procesos →
        </RouterLink>
      </div>

      <!-- Card 2: Expedientes de Donantes -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Expedientes Donantes</span>
            <span class="rounded-full bg-teal-50 text-teal-700 px-2.5 py-0.5 text-xs font-bold">Maestros</span>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-800">{{ summary.donors.total }}</span>
            <span class="text-xs text-slate-500">registrados</span>
          </div>
          <div class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>En Valoración:</span>
              <span class="font-bold text-amber-600">{{ summary.donors.byStatus.EN_VALORACION }}</span>
            </div>
            <div class="flex justify-between">
              <span>Activos:</span>
              <span class="font-bold text-teal-600">{{ summary.donors.byStatus.ACTIVO }}</span>
            </div>
            <div class="flex justify-between">
              <span>Cerrados:</span>
              <span class="font-bold text-slate-500">{{ summary.donors.byStatus.CERRADO }}</span>
            </div>
          </div>
        </div>
        <RouterLink to="/expedientes" class="mt-4 text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1">
          Gestionar expedientes →
        </RouterLink>
      </div>

      <!-- Card 3: Documentos en Operativos -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Documentos Proceso</span>
            <span class="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-bold">Instancias</span>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-800">{{ summary.documents.total }}</span>
            <span class="text-xs text-slate-500">en paquetes</span>
          </div>
          <div class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>Liberados / Firmados:</span>
              <span class="font-bold text-emerald-600">{{ summary.documents.byStatus.LIBERADO + summary.documents.byStatus.FIRMADO }}</span>
            </div>
            <div class="flex justify-between">
              <span>Diligenciados / Validados:</span>
              <span class="font-bold text-blue-600">{{ summary.documents.byStatus.DILIGENCIADO + summary.documents.byStatus.VALIDADO }}</span>
            </div>
            <div class="flex justify-between">
              <span>Pendientes:</span>
              <span class="font-bold text-amber-600">{{ summary.documents.byStatus.PENDIENTE }}</span>
            </div>
          </div>
        </div>
        <RouterLink to="/procesos" class="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          Revisar documentos activos →
        </RouterLink>
      </div>

      <!-- Card 4: Catálogo Oficial -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Catálogo Documental</span>
            <span class="rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 text-xs font-bold">Oficial</span>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-800">19</span>
            <span class="text-xs text-slate-500">formatos vigentes</span>
          </div>
          <div class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>Anexos 1 a 9 + Variantes 7:</span>
              <span class="font-bold text-purple-600">19 publicados</span>
            </div>
            <div class="flex justify-between">
              <span>Posiciones Reservadas (20-23):</span>
              <span class="font-bold text-slate-400">4 homol. pend.</span>
            </div>
            <div class="flex justify-between">
              <span>Paquete Normativo Total:</span>
              <span class="font-bold text-slate-700">23 posiciones</span>
            </div>
          </div>
        </div>
        <RouterLink to="/catalogo" class="mt-4 text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
          Explorar catálogo →
        </RouterLink>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div v-if="summary" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Operativos de Donación Recientes</h2>
          <p class="text-xs text-slate-500">Últimos procesos aperturados o actualizados en su alcance institucional</p>
        </div>
        <RouterLink to="/procesos" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          Ver todos →
        </RouterLink>
      </div>

      <div v-if="!summary.recentProcesses.length" class="py-12 text-center text-sm text-slate-500">
        No hay procesos de donación registrados en su ámbito institucional.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th class="pb-3 font-semibold">Código Operativo</th>
              <th class="pb-3 font-semibold">Donante</th>
              <th class="pb-3 font-semibold">IPS Principal</th>
              <th class="pb-3 font-semibold">Estado</th>
              <th class="pb-3 font-semibold">Última Actividad</th>
              <th class="pb-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="proc in summary.recentProcesses" :key="proc.id" class="hover:bg-slate-50/50">
              <td class="py-3.5 font-mono font-bold text-indigo-700">{{ proc.processCode }}</td>
              <td class="py-3.5">
                <p class="font-medium text-slate-800">{{ proc.donorName || "Donante en valoración" }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ proc.donorRndCode || "RND pendiente" }}</p>
              </td>
              <td class="py-3.5 text-xs text-slate-600">{{ proc.primaryIpsName }}</td>
              <td class="py-3.5">
                <StatusBadge :status="proc.status" />
              </td>
              <td class="py-3.5 text-xs text-slate-500">{{ formatDate(proc.updatedAt) }}</td>
              <td class="py-3.5 text-right">
                <RouterLink
                  :to="`/procesos/${proc.id}`"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold transition"
                >
                  Abrir Expediente
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
