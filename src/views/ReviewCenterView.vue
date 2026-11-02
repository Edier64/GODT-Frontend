<script setup lang="ts">
import { useRoute } from "vue-router";
import ConflictResolutionDialog from "../components/ConflictResolutionDialog.vue";
import ProvenancePanel from "../components/ProvenancePanel.vue";
import RevisionComparison from "../components/RevisionComparison.vue";
import RevisionHistory from "../components/RevisionHistory.vue";
import { useDocumentReviewController } from "../controllers/useDocumentReviewController";

const route = useRoute();
const donorId = String(route.params.donorId);
const {
  instance, loading, error, resolving, resolveError, revisions, selectedRevisions,
  conflicts, selectedRevisionIds, activeConflict, decision, justification,
  toggleRevision, openConflict, closeConflict, resolveConflict, formatDate
} = useDocumentReviewController(String(route.params.instanceId));
</script>

<template>
  <section>
    <RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" :to="`/expedientes/${donorId}/instancias`">← Volver a instancias</RouterLink>
    <div class="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="text-sm font-semibold text-[#159c9a]">Centro de revisión</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">{{ instance?.documentCode ?? "Instancia documental" }}</h2><p class="mt-2 text-sm text-[#6b8790]">Consulta trazable de revisiones, proveniencia y conflictos documentales.</p></div><span v-if="instance" class="rounded-full bg-[#edf4f6] px-3 py-2 text-xs font-semibold text-[#1e5575]">{{ instance.status }}</span></div>
    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
    <div v-if="loading" class="mt-8 grid gap-5 lg:grid-cols-2"><div v-for="i in 4" :key="i" class="h-48 animate-pulse rounded-2xl bg-[#e8eef1]" /></div>
    <div v-else-if="instance" class="mt-8 space-y-5"><RevisionHistory :revisions="revisions" :selected-ids="selectedRevisionIds" :format-date="formatDate" @toggle="toggleRevision" /><RevisionComparison :revisions="selectedRevisions" /><ProvenancePanel :revisions="revisions" :format-date="formatDate" /><div class="rounded-2xl border border-[#efc5c1] bg-white p-5"><div class="flex items-start justify-between gap-4"><div><h3 class="font-bold text-[#17313b]">Conflictos pendientes</h3><p class="mt-1 text-xs text-[#789098]">Solo los conflictos devueltos por el backend pueden resolverse.</p></div><span class="rounded-full bg-[#fff0ef] px-2.5 py-1 text-xs font-bold text-[#ad4039]">{{ conflicts.length }}</span></div><div v-if="!conflicts.length" class="mt-5 rounded-xl bg-[#effaf6] p-4 text-sm text-[#18735e]">No hay conflictos pendientes.</div><div v-else class="mt-4 space-y-2"><div v-for="conflict in conflicts" :key="`${conflict.revisionNumber}-${conflict.fieldPath}`" class="flex flex-col justify-between gap-3 rounded-xl border border-[#f3d9d5] bg-[#fffaf9] p-4 sm:flex-row sm:items-center"><div><p class="text-sm font-semibold text-[#17313b]">{{ conflict.fieldPath }}</p><p class="mt-1 text-xs text-[#789098]">Revisión #{{ conflict.revisionNumber }} · Origen {{ conflict.sourceKind }}</p></div><button class="focus-ring rounded-lg border border-[#ad4039] px-3 py-2 text-xs font-semibold text-[#ad4039]" @click="openConflict(conflict)">Resolver conflicto</button></div></div></div></div>
    <div v-else class="mt-8 rounded-2xl border border-[#dce6eb] bg-white p-10 text-center text-sm text-[#789098]">No fue posible cargar la instancia.</div>
    <ConflictResolutionDialog :conflict="activeConflict" :resolving="resolving" :error="resolveError" :decision="decision" :justification="justification" @close="closeConflict" @resolve="resolveConflict" @update:decision="decision = $event" @update:justification="justification = $event" />
  </section>
</template>
