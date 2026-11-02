<script setup lang="ts">
import type { DonorStatus } from "../types/donors";

defineProps<{ status: DonorStatus }>();
const labels: Record<DonorStatus, string> = {
  EN_VALORACION: "En valoración",
  ACTIVO: "Activo",
  CERRADO: "Cerrado"
};
</script>

<template>
  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" :class="{
    'bg-[#fff4d6] text-[#8b6500]': status === 'EN_VALORACION',
    'bg-[#dff5ee] text-[#18735e]': status === 'ACTIVO',
    'bg-[#e9eef0] text-[#536b72]': status === 'CERRADO'
  }">{{ labels[status] }}</span>
</template>
