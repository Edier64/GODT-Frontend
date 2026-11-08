<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../components/AppLayout.vue";
import StatusBadge from "../components/StatusBadge.vue";
import EntityAutocomplete from "../components/EntityAutocomplete.vue";
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
  intakeClinicalHistory,
} = useDonationProcessController();

const donorsStore = useDonorsStore();

const filterStatus = ref<string>("");
const showModal = ref(false);
const creationMode = ref<"EXISTING" | "NEW" | "CLINICAL_HISTORY">("EXISTING");
const clinicalFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const intakeError = ref<string | null>(null);
const isDragging = ref(false);
const dragCounter = ref(0);
const isSubmitting = ref(false);

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
];

const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/x-ms-bmp",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "ARCHIVO";
}

function isImageFile(filename: string, mime: string): boolean {
  if (mime && mime.startsWith("image/")) return true;
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"].includes(ext);
}

function validateAndProcessFile(file: File | undefined | null) {
  intakeError.value = null;
  if (!file) return;

  if (file.size === 0) {
    intakeError.value = "El archivo seleccionado está vacío (0 bytes).";
    clinicalFile.value = null;
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    intakeError.value = "El tamaño del archivo no puede exceder los 20 MB.";
    clinicalFile.value = null;
    return;
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime =
    (file.type && file.type.startsWith("image/")) ||
    ALLOWED_MIME_PREFIXES.includes(file.type);

  if (!hasValidExt && !hasValidMime) {
    intakeError.value =
      "Formato no compatible. Admite PDF, Word (DOCX) o imágenes (JPG, PNG, WebP, TIFF, BMP).";
    clinicalFile.value = null;
    return;
  }

  clinicalFile.value = file;
}

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.value++;
  isDragging.value = true;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
  isDragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    dragCounter.value = 0;
    isDragging.value = false;
  }
}

function onFileDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  dragCounter.value = 0;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    validateAndProcessFile(files[0]);
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    validateAndProcessFile(target.files[0]);
  }
}

function resetClinicalFile() {
  clinicalFile.value = null;
  intakeError.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

const form = reactive({
  donorId: "",
  primaryIpsName: "",
  processCode: "",
  notes: "",
  newDonor: {
    fullName: "",
    documentNumber: "",
    clinicalService: "UCI Adultos",
    bloodGroup: "",
    rhFactor: "",
  },
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
  creationMode.value = donorsStore.page.items.length > 0 ? "EXISTING" : "NEW";
  resetForm();
  showModal.value = true;
}

function openClinicalIntakeModal() {
  creationMode.value = "CLINICAL_HISTORY";
  resetForm();
  showModal.value = true;
}

function resetForm() {
  form.donorId = "";
  form.primaryIpsName = "";
  form.processCode = "";
  form.notes = "";
  form.newDonor.fullName = "";
  form.newDonor.documentNumber = "";
  form.newDonor.clinicalService = "UCI Adultos";
  form.newDonor.bloodGroup = "";
  form.newDonor.rhFactor = "";
  clinicalFile.value = null;
  intakeError.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

function onDonorChange() {
  const selected = donorsStore.page.items.find((d: Donor) => d.id === form.donorId);
  if (selected && !form.primaryIpsName) {
    form.primaryIpsName = selected.originatingIpsName;
  }
}

async function handleCreate() {
  if (isSubmitting.value) return;
  intakeError.value = null;
  if (!form.primaryIpsName.trim()) return;

  if (creationMode.value === "CLINICAL_HISTORY") {
    if (!clinicalFile.value) {
      intakeError.value = "Debe adjuntar el archivo de la historia clínica o imagen escaneada.";
      return;
    }
    isSubmitting.value = true;
    try {
      const result = await intakeClinicalHistory({
        file: clinicalFile.value,
        primaryIpsName: form.primaryIpsName.trim(),
        notes: form.notes.trim() || undefined,
        processCode: form.processCode.trim() || undefined,
      });
      if (result) {
        showModal.value = false;
        router.push({
          path: `/procesos/${result.process.id}`,
          query: { tab: "sources", openOcrDoc: result.sourceDocument.id },
        });
      }
    } finally {
      isSubmitting.value = false;
    }
    return;
  }

  if (creationMode.value === "EXISTING" && !form.donorId) return;

  const payload: any = {
    primaryIpsName: form.primaryIpsName.trim(),
    processCode: form.processCode.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };

  if (creationMode.value === "EXISTING") {
    payload.donorId = form.donorId;
  } else {
    payload.donor = {
      fullName: form.newDonor.fullName.trim() || undefined,
      documentNumber: form.newDonor.documentNumber.trim() || undefined,
      clinicalService: form.newDonor.clinicalService.trim() || undefined,
      bloodGroup: form.newDonor.bloodGroup.trim() || undefined,
      rhFactor: form.newDonor.rhFactor.trim() || undefined,
      originatingIpsName: form.primaryIpsName.trim(),
    };
  }

  const result = await openProcess(payload);

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
  <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Procesos de Donación</h1>
          <p class="text-sm text-slate-500">
            Gestión de operativos de donación, rescate y coordinación regional
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm text-sm font-medium transition cursor-pointer"
            @click="openClinicalIntakeModal"
          >
            <span>📄</span>
            Ingesta desde Historia Clínica
          </button>
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

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th class="px-6 py-3.5 whitespace-nowrap">Código Acción</th>
                <th class="px-6 py-3.5 whitespace-nowrap">Donante</th>
                <th class="px-6 py-3.5 whitespace-nowrap">IPS Principal</th>
                <th class="px-6 py-3.5 whitespace-nowrap">Estado</th>
                <th class="px-6 py-3.5 whitespace-nowrap">Fecha Apertura</th>
                <th class="px-6 py-3.5 text-right whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 divide-solid">
              <tr
                v-for="proc in processes"
                :key="proc.id"
                class="hover:bg-slate-50/80 transition cursor-pointer"
                @click="router.push(`/procesos/${proc.id}`)"
              >
                <td class="px-6 py-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                  {{ proc.processCode }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-slate-900">{{ proc.donor?.fullName || "Donante no asignado" }}</div>
                  <div class="text-xs text-slate-500 font-mono">{{ proc.donor?.rndCode || proc.donorId }}</div>
                </td>
                <td class="px-6 py-4 text-slate-700 whitespace-nowrap">
                  {{ proc.primaryIpsName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <StatusBadge :status="proc.status" />
                </td>
                <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {{ formatDate(proc.openedAt) }}
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
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
            <!-- Modalidad de Donante: Existente vs Desde Cero vs Ingesta HC -->
            <div class="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                class="flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition"
                :class="creationMode === 'EXISTING' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                @click="creationMode = 'EXISTING'"
              >
                Donante Existente
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition"
                :class="creationMode === 'NEW' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                @click="creationMode = 'NEW'"
              >
                Nuevo Donante (Manual)
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1"
                :class="creationMode === 'CLINICAL_HISTORY' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                @click="creationMode = 'CLINICAL_HISTORY'"
              >
                <span>📄</span>
                Ingesta HC (OCR / IA)
              </button>
            </div>

            <!-- Error de Ingesta -->
            <div v-if="intakeError" class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {{ intakeError }}
            </div>

            <!-- Modo Ingesta desde Historia Clínica -->
            <div v-if="creationMode === 'CLINICAL_HISTORY'" class="space-y-3 p-3.5 bg-teal-50/60 rounded-xl border border-teal-200">
              <div class="flex items-start gap-2 text-xs text-teal-950">
                <span class="text-base leading-none">🤖</span>
                <div class="leading-relaxed">
                  <strong>Extracción Inteligente con IA Multimodal:</strong> Cargue o arrastre la historia clínica (PDF digital/escaneado, DOCX o imágenes JPG, PNG, WebP, TIFF, BMP). La IA multimodal leerá el documento clínico y autollenará los campos del donante y anexos compatibles.
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Archivo de Historia Clínica * (PDF, DOCX, JPG, PNG, WEBP, TIFF o BMP — máx 20MB)
                </label>
                <!-- Zona Drag & Drop con soporte completo para imágenes y documentos -->
                <div
                  class="relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 select-none"
                  :class="[
                    isDragging
                      ? 'border-teal-500 bg-teal-50/90 ring-4 ring-teal-400/30 scale-[1.01]'
                      : clinicalFile
                        ? 'border-teal-300 bg-white hover:border-teal-400'
                        : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-white'
                  ]"
                  @dragenter="onDragEnter"
                  @dragover="onDragOver"
                  @dragleave="onDragLeave"
                  @drop="onFileDrop"
                  @click="fileInputRef?.click()"
                >
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    class="hidden"
                    @change="onFileChange"
                  />
                  <!-- Estado sin archivo -->
                  <div v-if="!clinicalFile" class="space-y-2 py-1">
                    <div
                      class="inline-flex items-center justify-center w-12 h-12 rounded-full transition-transform"
                      :class="isDragging ? 'bg-teal-100 text-teal-600 scale-110' : 'bg-slate-100 text-slate-500'"
                    >
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-700">
                        {{ isDragging ? '¡Suelte el archivo aquí!' : 'Haga clic para seleccionar o arrastre el archivo aquí' }}
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Formatos: PDF, Word (DOCX) o imágenes escaneadas (JPG, PNG, WEBP, TIFF, BMP)
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">PDF</span>
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">DOCX</span>
                      <span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-mono font-semibold">JPG / JPEG</span>
                      <span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-mono font-semibold">PNG</span>
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">WEBP</span>
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">TIFF / BMP</span>
                      <span class="text-[10px] text-slate-400 font-medium">· máx 20 MB</span>
                    </div>
                  </div>
                  <!-- Estado con archivo cargado -->
                  <div v-else class="flex items-center justify-between gap-3 p-2 bg-teal-50/50 rounded-lg border border-teal-200" @click.stop>
                    <div class="flex items-center gap-3 text-left truncate">
                      <div
                        class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        :class="isImageFile(clinicalFile.name, clinicalFile.type) ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'"
                      >
                        <span class="text-xl">{{ isImageFile(clinicalFile.name, clinicalFile.type) ? '🖼️' : '📄' }}</span>
                      </div>
                      <div class="truncate">
                        <div class="flex items-center gap-2">
                          <p class="text-xs font-bold text-slate-800 truncate">{{ clinicalFile.name }}</p>
                          <span class="px-1.5 py-0.2 bg-teal-200 text-teal-800 rounded text-[9px] font-mono font-bold uppercase">
                            {{ getFileExtension(clinicalFile.name) }}
                          </span>
                        </div>
                        <p class="text-[11px] text-slate-500 font-mono">
                          {{ formatFileSize(clinicalFile.size) }} · <span class="text-teal-700 font-medium">Listo para lectura con IA multimodal</span>
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        class="px-2.5 py-1 text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-md font-semibold transition cursor-pointer"
                        @click="fileInputRef?.click()"
                      >
                        Reemplazar
                      </button>
                      <button
                        type="button"
                        class="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md font-semibold transition cursor-pointer"
                        @click="resetClinicalFile"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modo Donante Existente -->
            <div v-else-if="creationMode === 'EXISTING'">
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Donante Asociado *
              </label>
              <select
                v-model="form.donorId"
                :required="creationMode === 'EXISTING'"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                @change="onDonorChange"
              >
                <option value="" disabled>Seleccione un donante...</option>
                <option v-for="d in donorsStore.page.items" :key="d.id" :value="d.id">
                  {{ d.fullName }} — {{ d.rndCode }} ({{ d.originatingIpsName }})
                </option>
              </select>
              <p v-if="donorsStore.page.items.length === 0" class="mt-1 text-xs text-amber-600">
                No hay donantes previos. Puede usar la pestaña «Iniciar Nuevo Donante».
              </p>
            </div>

            <!-- Modo Nuevo Donante Desde Cero -->
            <div v-else class="space-y-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div class="text-xs font-bold text-indigo-900">
                Datos preliminares del potencial donante
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-700 mb-1">Nombre completo / Preliminar</label>
                  <input
                    v-model="form.newDonor.fullName"
                    type="text"
                    placeholder="Ej. Donante en valoración"
                    class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-700 mb-1">Identificación / Cédula</label>
                  <input
                    v-model="form.newDonor.documentNumber"
                    type="text"
                    placeholder="Opcional si es no identificado"
                    class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                  <EntityAutocomplete
                    v-model="form.newDonor.clinicalService"
                    entity-type="SERVICE"
                    label="Servicio Clínico de Origen"
                    placeholder="Buscar servicio (ej. UCI Adultos, Urgencias...)"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-700 mb-1">Grupo y RH</label>
                  <div class="flex gap-1">
                    <input
                      v-model="form.newDonor.bloodGroup"
                      type="text"
                      placeholder="O"
                      class="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 text-center"
                    />
                    <input
                      v-model="form.newDonor.rhFactor"
                      type="text"
                      placeholder="+"
                      class="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <EntityAutocomplete
                v-model="form.primaryIpsName"
                entity-type="IPS"
                label="IPS Principal del Operativo"
                placeholder="Escribe para buscar (ej. Imbanaco, HUV...)"
                required
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
                :disabled="loading || isSubmitting"
                class="px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 text-white flex items-center gap-2"
                :class="creationMode === 'CLINICAL_HISTORY' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'"
              >
                <svg v-if="loading || isSubmitting" class="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>
                  {{
                    loading || isSubmitting
                      ? creationMode === "CLINICAL_HISTORY"
                        ? "Procesando con IA Multimodal..."
                        : "Abriendo..."
                      : creationMode === "CLINICAL_HISTORY"
                        ? "Subir y Analizar Historia Clínica"
                        : "Aperturar Proceso"
                  }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
  </div>
</template>
