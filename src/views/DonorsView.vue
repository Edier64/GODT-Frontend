<script setup lang="ts">
import StatusBadge from "../components/StatusBadge.vue";
import { useDonorsController } from "../controllers/useDonorsController";

const { store, filters, form, formError, editing, showForm, totalPages, load, openCreate, openEdit, submit, formatDate } = useDonorsController();
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p class="text-sm font-semibold text-[#4c8f89]">Gestión de expedientes</p><h2 class="mt-1 text-3xl font-bold tracking-tight text-[#17313b]">Donantes</h2><p class="mt-2 text-sm text-[#6b8790]">Consulta, registra y actualiza expedientes maestros.</p></div>
      <button class="focus-ring rounded-xl bg-[#123c4a] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1b5363]" @click="openCreate">+ Nuevo expediente</button>
    </div>
    <div class="mt-8 rounded-2xl border border-[#dce7e9] bg-white p-4 sm:p-5">
      <form class="grid gap-3 md:grid-cols-[1fr_220px_auto]" @submit.prevent="filters.page = 1; load()">
        <input v-model="filters.rndCode" class="focus-ring rounded-xl border border-[#cbdcdf] px-4 py-3 text-sm" placeholder="Buscar por código RND" />
        <select v-model="filters.status" class="focus-ring rounded-xl border border-[#cbdcdf] px-4 py-3 text-sm"><option value="">Todos los estados</option><option value="EN_VALORACION">En valoración</option><option value="ACTIVO">Activo</option><option value="CERRADO">Cerrado</option></select>
        <button class="focus-ring rounded-xl border border-[#b5cecf] px-5 py-3 text-sm font-semibold text-[#236c6a] hover:bg-[#eff8f6]" type="submit">Filtrar</button>
      </form>
      <p v-if="store.error" class="mt-4 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#ad4039]">{{ store.error }}</p>
      <div class="mt-5 overflow-x-auto">
        <div v-if="store.loading" class="py-12 text-center text-sm text-[#6b8790]">
          <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#159c9a] border-r-transparent mb-2"></div>
          <div>Cargando expedientes maestros…</div>
        </div>
        <table v-else-if="store.page.items.length" class="w-full min-w-[760px] text-left text-sm">
          <thead class="border-b border-[#e5edef] text-xs uppercase tracking-wide text-[#789098]"><tr><th class="px-3 py-3 font-semibold">RND</th><th class="px-3 py-3 font-semibold">Donante</th><th class="px-3 py-3 font-semibold">IPS de origen</th><th class="px-3 py-3 font-semibold">Estado</th><th class="px-3 py-3 font-semibold">Registro</th><th class="px-3 py-3"></th></tr></thead>
          <tbody><tr v-for="donor in store.page.items" :key="donor.id" class="border-b border-[#edf2f3] last:border-0 hover:bg-slate-50/50"><td class="px-3 py-4 font-semibold text-[#236c6a]">{{ donor.rndCode }}</td><td class="px-3 py-4"><p class="font-semibold text-[#17313b]">{{ donor.fullName }}</p><p class="mt-1 text-xs text-[#789098]">{{ donor.documentNumber }}</p></td><td class="px-3 py-4 text-[#49636b]">{{ donor.originatingIpsName }}</td><td class="px-3 py-4"><StatusBadge :status="donor.status" /></td><td class="px-3 py-4 text-[#6b8790]">{{ formatDate(donor.createdAt) }}</td><td class="px-3 py-4 text-right"><RouterLink class="focus-ring mr-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#159c9a] hover:bg-[#eff8f6]" :to="`/expedientes/${donor.id}/documentos`">Documentos</RouterLink><RouterLink class="focus-ring mr-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#1e5575] hover:bg-[#eff8f6]" :to="`/expedientes/${donor.id}/instancias`">Instancias</RouterLink><RouterLink class="focus-ring mr-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#17817d] hover:bg-[#eff8f6]" :to="`/expedientes/${donor.id}/legalizacion`">Legalizar</RouterLink><button class="focus-ring rounded-lg px-3 py-2 text-xs font-semibold text-[#236c6a] hover:bg-[#eff8f6]" @click="openEdit(donor)">Editar</button></td></tr></tbody>
        </table>
        <div v-else class="py-16 text-center text-sm text-[#6b8790]">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f4f6] text-xl font-bold mb-3">📋</div>
          <p class="font-semibold text-[#17313b]">No se encontraron expedientes</p>
          <p class="mt-1 text-xs text-[#789098]">Registre un nuevo donante o modifique los criterios de búsqueda.</p>
        </div>
      </div>
      <div class="mt-5 flex items-center justify-between border-t border-[#edf2f3] pt-4 text-sm text-[#6b8790]"><span>{{ store.page.total }} expediente(s)</span><div class="flex gap-2"><button class="focus-ring rounded-lg border px-3 py-2 disabled:opacity-40" :disabled="filters.page <= 1 || store.loading" @click="filters.page--; load()">Anterior</button><span class="px-2 py-2">{{ filters.page }} / {{ totalPages }}</span><button class="focus-ring rounded-lg border px-3 py-2 disabled:opacity-40" :disabled="filters.page >= totalPages || store.loading" @click="filters.page++; load()">Siguiente</button></div></div>
    </div>
    <div v-if="showForm" class="fixed inset-0 z-10 overflow-y-auto bg-[#123c4a]/40 p-4 sm:p-8" @click.self="showForm = false">
      <form class="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8" @submit.prevent="submit">
        <div class="flex items-start justify-between"><div><p class="text-sm font-semibold text-[#4c8f89]">{{ editing ? "Actualizar" : "Registrar" }}</p><h3 class="mt-1 text-2xl font-bold text-[#17313b]">{{ editing ? "Expediente maestro" : "Nuevo expediente" }}</h3></div><button type="button" class="focus-ring text-2xl text-[#789098]" @click="showForm = false">×</button></div>
        <p v-if="formError" class="mt-5 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#ad4039]">{{ formError }}</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label v-if="!editing" class="text-sm font-semibold text-[#49636b]">Código RND<input v-model="form.rndCode" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" required /></label>
          <label class="text-sm font-semibold text-[#49636b]">Nombre completo<input v-model="form.fullName" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" required /></label>
          <label class="text-sm font-semibold text-[#49636b]">Documento<input v-model="form.documentNumber" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" required /></label>
          <label class="text-sm font-semibold text-[#49636b]">IPS de origen<input v-model="form.originatingIpsName" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" required /></label>
          <label class="text-sm font-semibold text-[#49636b]">Servicio clínico<input v-model="form.clinicalService" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" required /></label>
          <label class="text-sm font-semibold text-[#49636b]">Estado<select v-model="form.status" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal"><option value="EN_VALORACION">En valoración</option><option value="ACTIVO">Activo</option><option value="CERRADO">Cerrado</option></select></label>
          <label class="text-sm font-semibold text-[#49636b]">Grupo sanguíneo<input v-model="form.bloodGroup" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" /></label>
          <label class="text-sm font-semibold text-[#49636b]">Factor Rh<input v-model="form.rhFactor" class="focus-ring mt-2 w-full rounded-xl border border-[#cbdcdf] px-4 py-3 font-normal" /></label>
        </div>
        <div class="mt-8 flex justify-end gap-3"><button type="button" class="focus-ring rounded-xl px-5 py-3 text-sm text-[#49636b]" @click="showForm = false">Cancelar</button><button class="focus-ring rounded-xl bg-[#123c4a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="store.loading">{{ store.loading ? "Guardando…" : "Guardar expediente" }}</button></div>
      </form>
    </div>
  </section>
</template>
