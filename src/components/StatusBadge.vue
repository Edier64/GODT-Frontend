<script setup lang="ts">
import type { DonorStatus } from "../types/donors";
import type { DonationProcessStatus } from "../types/donation-process";

const props = defineProps<{ status: DonorStatus | DonationProcessStatus | string }>();

const labels: Record<string, string> = {
  EN_VALORACION: "En valoración",
  ACTIVO: "Activo",
  CERRADO: "Cerrado",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
  SUSPENDIDO: "Suspendido",
  PENDIENTE: "Pendiente",
  EN_DILIGENCIAMIENTO: "En diligenciamiento",
  EN_REVISION: "En revisión",
  BLOQUEADO: "Bloqueado",
  FIRMADO: "Firmado",
  NO_APLICA: "No Aplica",
};

const badgeClasses: Record<string, string> = {
  EN_VALORACION: "bg-[#fff4d6] text-[#8b6500]",
  ACTIVO: "bg-[#dff5ee] text-[#18735e]",
  CERRADO: "bg-[#e9eef0] text-[#536b72]",
  EN_CURSO: "bg-blue-100 text-blue-800",
  COMPLETADO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-rose-100 text-rose-800",
  SUSPENDIDO: "bg-amber-100 text-amber-800",
  PENDIENTE: "bg-slate-100 text-slate-700",
  EN_DILIGENCIAMIENTO: "bg-indigo-100 text-indigo-800",
  EN_REVISION: "bg-purple-100 text-purple-800",
  BLOQUEADO: "bg-orange-100 text-orange-800",
  FIRMADO: "bg-teal-100 text-teal-800",
  NO_APLICA: "bg-zinc-200 text-zinc-600 line-through",
};
</script>

<template>
  <span
    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
    :class="badgeClasses[props.status] || 'bg-slate-100 text-slate-700'"
  >
    {{ labels[props.status] || props.status }}
  </span>
</template>
