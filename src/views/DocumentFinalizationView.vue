<script setup lang="ts">
import { useRoute } from "vue-router";
import { useDocumentFinalizationController } from "../controllers/useDocumentFinalizationController";

const route = useRoute();
const donorId = String(route.params.donorId);
const { instance, loading, validating, error, validationMessage, validateTechnicalData } =
  useDocumentFinalizationController(String(route.params.instanceId));

const stages = [
  { key: "DRAFT", label: "Borrador", description: "Respuesta editable y revisiones append-only." },
  { key: "IN_REVIEW", label: "Validación técnica", description: "Validación JSON Schema ejecutada por backend." },
  { key: "APPROVED", label: "Aprobación formal", description: "Pendiente: no existe caso de uso ni endpoint." },
  { key: "GENERATED", label: "Documento final", description: "Pendiente: no existe generación ni descarga PDF." }
];

function stageState(key: string) {
  if (!instance.value) return "pending";
  if (key === instance.value.status) return "current";
  if (key === "DRAFT" && instance.value.status !== "DRAFT") return "done";
  return "pending";
}
</script>

<template>
  <section>
    <RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/instancias/${route.params.instanceId}/revision`">← Volver al centro de revisión</RouterLink>
    <div class="mt-5"><p class="text-sm font-semibold text-[#159c9a]">Revisión formal y documentos finales</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">{{ instance?.documentCode ?? "Instancia documental" }}</h2><p class="mt-2 max-w-3xl text-sm leading-6 text-[#6b8790]">Separa la validación técnica de la aprobación institucional, generación documental y firmas. Solo las operaciones soportadas por el backend son accionables.</p></div>
    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
    <div v-if="loading" class="mt-8 grid gap-4 lg:grid-cols-2"><div v-for="i in 4" :key="i" class="h-32 animate-pulse rounded-2xl bg-[#e8eef1]" /></div>
    <div v-else-if="instance" class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="rounded-2xl border border-[#dce6eb] bg-white p-5 sm:p-8"><div class="flex items-center justify-between gap-3"><div><h3 class="font-bold text-[#17313b]">Ciclo de la instancia</h3><p class="mt-1 text-xs text-[#789098]">Estado actual: {{ instance.status }}</p></div><RouterLink class="focus-ring rounded-lg border border-[#159c9a] px-3 py-2 text-xs font-semibold text-[#159c9a]" :to="`/expedientes/${donorId}/instancias/${instance.id}/revision`">Ver trazabilidad</RouterLink></div><div class="mt-7 space-y-3"><div v-for="stage in stages" :key="stage.key" class="flex items-start gap-4 rounded-xl border p-4" :class="stageState(stage.key) === 'current' ? 'border-[#159c9a] bg-[#effaf6]' : stageState(stage.key) === 'done' ? 'border-[#b9e2d7] bg-[#fbfefd]' : 'border-[#edf2f3] bg-[#fbfcfd]'"><span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold" :class="stageState(stage.key) === 'current' || stageState(stage.key) === 'done' ? 'bg-[#159c9a] text-white' : 'bg-[#e8eef1] text-[#789098]'">{{ stageState(stage.key) === "done" ? "✓" : stage.key === instance.status ? "•" : "—" }}</span><div><p class="text-sm font-bold text-[#17313b]">{{ stage.label }}</p><p class="mt-1 text-xs leading-5 text-[#789098]">{{ stage.description }}</p></div></div></div><div v-if="validationMessage" class="mt-6 rounded-xl bg-[#effaf6] p-4 text-sm text-[#18735e]">{{ validationMessage }}</div><div class="mt-7 flex justify-end"><button class="focus-ring rounded-lg bg-[#123047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="validating" @click="validateTechnicalData">{{ validating ? "Validando…" : "Ejecutar validación técnica" }}</button></div></div>
      <aside class="space-y-5"><div class="rounded-2xl border border-[#dce6eb] bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-[#159c9a]">Matriz de disponibilidad</p><div class="mt-4 space-y-3 text-xs"><div class="flex items-start justify-between gap-3"><span class="text-[#49636b]">Validación JSON Schema</span><strong class="text-[#18735e]">Disponible</strong></div><div class="flex items-start justify-between gap-3"><span class="text-[#49636b]">Aprobación formal</span><strong class="text-[#ad4039]">Pendiente backend</strong></div><div class="flex items-start justify-between gap-3"><span class="text-[#49636b]">Generación PDF</span><strong class="text-[#ad4039]">Pendiente backend</strong></div><div class="flex items-start justify-between gap-3"><span class="text-[#49636b]">PDF/A-1a</span><strong class="text-[#ad4039]">No verificado</strong></div><div class="flex items-start justify-between gap-3"><span class="text-[#49636b]">Firma electrónica</span><strong class="text-[#ad4039]">No disponible</strong></div></div></div><div class="rounded-2xl border border-[#f1dfaa] bg-[#fffaf0] p-5"><p class="text-sm font-bold text-[#856800]">Sin acciones ficticias</p><p class="mt-2 text-xs leading-5 text-[#856800]">El frontend no genera PDFs clínicos, no afirma conformidad PDF/A, no aprueba instancias y no simula firmas o certificados.</p></div></aside>
    </div>
    <div v-else class="mt-8 rounded-2xl border border-[#dce6eb] bg-white p-10 text-center text-sm text-[#789098]">No fue posible cargar la instancia.</div>
  </section>
</template>
