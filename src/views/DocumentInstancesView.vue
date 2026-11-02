<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useDocumentInstancesController } from "../controllers/useDocumentInstancesController";
const route = useRoute();
const donorId = String(route.params.donorId);
const { instances, loading, error, load } = useDocumentInstancesController(donorId);
onMounted(load);
</script>

<template>
  <section><RouterLink class="text-xs font-semibold text-[#159c9a] hover:underline" to="/expedientes">← Volver a expedientes</RouterLink><p class="mt-5 text-sm font-semibold text-[#159c9a]">Diligenciamiento inteligente</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Instancias documentales</h2><p class="mt-2 text-sm text-[#6b8790]">Respuestas versionadas asociadas al expediente.</p>
    <p v-if="error" class="mt-6 rounded-xl bg-[#fff0ef] p-4 text-sm text-[#ad4039]">{{ error }}</p>
    <div class="mt-8 overflow-hidden rounded-2xl border border-[#dce6eb] bg-white"><div v-if="loading" class="space-y-3 p-5"><div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl bg-[#eef3f5]" /></div><div v-else-if="!instances.length" class="px-6 py-16 text-center text-sm text-[#789098]">No hay instancias documentales para este expediente.</div><div v-else class="divide-y divide-[#edf2f3]"><div v-for="instance in instances" :key="instance.id" class="flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center"><RouterLink class="min-w-0 hover:opacity-80" :to="`/expedientes/${donorId}/instancias/${instance.id}`"><p class="font-semibold text-[#17313b]">{{ instance.documentCode }}</p><p class="mt-1 text-xs text-[#789098]">Versión {{ instance.templateVersion?.versionNumber ?? instance.templateVersionId }} · revisión actual #{{ instance.currentRevision?.revisionNumber ?? 0 }}</p></RouterLink><div class="flex items-center gap-2"><span class="rounded-full bg-[#edf4f6] px-3 py-1 text-xs font-semibold text-[#1e5575]">{{ instance.status }}</span><RouterLink class="focus-ring rounded-lg border border-[#159c9a] px-3 py-2 text-xs font-semibold text-[#159c9a]" :to="`/expedientes/${donorId}/instancias/${instance.id}/revision`">Revisar</RouterLink><RouterLink class="focus-ring rounded-lg border border-[#1e5575] px-3 py-2 text-xs font-semibold text-[#1e5575]" :to="`/expedientes/${donorId}/instancias/${instance.id}/finalizacion`">Formalizar</RouterLink></div></div></div></div>
  </section>
</template>
