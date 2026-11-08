<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import {
  fetchOriginalTemplateBlob,
  fetchPreviewPdfBlob,
  fetchDiligencedDocxBlob,
} from "../services/institutions";

const props = defineProps<{
  show: boolean;
  documentCode: string;
  instanceId?: string;
  revisionId?: string;
  documentTitle: string;
  status?: string;
  revisionNumber?: number;
  initialTab?: "ORIGINAL" | "DILIGENCED";
  canEdit?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "diligence"): void;
}>();

const activeTab = ref<"ORIGINAL" | "DILIGENCED">(
  props.initialTab || (props.instanceId ? "DILIGENCED" : "ORIGINAL"),
);
const zoomLevel = ref<number>(100);
const loading = ref(false);
const error = ref<string | null>(null);
const isAuthError = ref(false);
const isNotDiligenced = ref(false);
const activeBlobUrl = ref<string | null>(null);
const downloading = ref(false);

const isAnexo5 = computed(() => props.documentCode.toLowerCase() === "anexo_5");

function cleanupBlobUrl() {
  if (activeBlobUrl.value) {
    URL.revokeObjectURL(activeBlobUrl.value);
    activeBlobUrl.value = null;
  }
}

async function loadDocument() {
  if (!props.show || !props.documentCode) return;
  cleanupBlobUrl();
  loading.value = true;
  error.value = null;
  isAuthError.value = false;
  isNotDiligenced.value = false;

  try {
    let blob: Blob;
    if (activeTab.value === "DILIGENCED") {
      if (!props.instanceId) {
        isNotDiligenced.value = true;
        error.value = "Este documento todavía no tiene información diligenciada para generar su PDF.";
        loading.value = false;
        return;
      }
      blob = await fetchPreviewPdfBlob(props.instanceId, props.revisionId);
    } else {
      blob = await fetchOriginalTemplateBlob(props.documentCode);
    }

    activeBlobUrl.value = URL.createObjectURL(blob);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      isAuthError.value = true;
      error.value = "Su sesión ha expirado o no tiene permisos para consultar este documento. Por favor vuelva a iniciar sesión.";
    } else if (err?.response?.status === 404) {
      if (activeTab.value === "DILIGENCED") {
        isNotDiligenced.value = true;
        error.value = "Este documento todavía no tiene información diligenciada para generar su PDF.";
      } else {
        error.value = "El formato institucional solicitado no se encuentra en el repositorio oficial.";
      }
    } else {
      error.value = err?.response?.data?.message || err?.message || "Error al cargar la visualización del documento.";
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      activeTab.value = props.initialTab || (props.instanceId ? "DILIGENCED" : "ORIGINAL");
      loadDocument();
    } else {
      cleanupBlobUrl();
    }
  },
  { immediate: true },
);

watch(
  () => [props.documentCode, props.instanceId, props.revisionId, activeTab.value],
  () => {
    if (props.show) {
      loadDocument();
    }
  },
);

onUnmounted(() => {
  cleanupBlobUrl();
});

const activeIframeSrc = computed(() => {
  if (!activeBlobUrl.value) return "";
  return `${activeBlobUrl.value}#toolbar=0&view=FitH`;
});

function zoomIn() {
  if (zoomLevel.value < 160) zoomLevel.value += 15;
}

function zoomOut() {
  if (zoomLevel.value > 70) zoomLevel.value -= 15;
}

function resetZoom() {
  zoomLevel.value = 100;
}

async function handleDownload(type: "ORIGINAL" | "DILIGENCED") {
  if (downloading.value) return;
  downloading.value = true;

  try {
    let blob: Blob;
    let filename = `${props.documentCode}_original.pdf`;

    if (type === "DILIGENCED" && props.instanceId) {
      if (isAnexo5.value) {
        blob = await fetchDiligencedDocxBlob(props.instanceId, props.revisionId);
        filename = `${props.documentCode}_diligenciado.docx`;
      } else {
        blob = await fetchPreviewPdfBlob(props.instanceId, props.revisionId, true);
        filename = `${props.documentCode}_diligenciado_rev${props.revisionNumber || 1}.pdf`;
      }
    } else {
      blob = await fetchOriginalTemplateBlob(props.documentCode, true);
      filename = `${props.documentCode}_original.${isAnexo5.value ? "docx" : "pdf"}`;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      alert("Sesión expirada o no autorizada. Por favor inicie sesión nuevamente.");
    } else {
      alert("No fue posible descargar el documento institucional.");
    }
  } finally {
    downloading.value = false;
  }
}

function handleGoToDiligence() {
  emit("diligence");
  emit("close");
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-3 sm:p-5 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
    >
      <!-- Cabecera del visor -->
      <div
        class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-9 h-9 rounded-xl bg-[#123047] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
          >
            PDF
          </div>
          <div class="truncate">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-bold text-slate-800 truncate">
                {{ documentTitle || documentCode }}
              </h3>
              <span
                v-if="status"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="{
                  'bg-amber-100 text-amber-800': status === 'BORRADOR',
                  'bg-blue-100 text-blue-800': status === 'VALIDADO',
                  'bg-emerald-100 text-emerald-800': status === 'COMPLETADO',
                  'bg-purple-100 text-purple-800': status === 'PENDIENTE_FIRMAS',
                  'bg-teal-100 text-teal-800': status === 'FIRMADO',
                  'bg-green-100 text-green-900': status === 'LIBERADO',
                }"
              >
                {{ status }}
              </span>
              <span
                v-if="revisionNumber"
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700"
              >
                Revisión #{{ revisionNumber }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-mono mt-0.5">
              Código normativo: {{ documentCode.toUpperCase() }}
            </p>
          </div>
        </div>

        <!-- Botones de acción y pestañas -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Pestañas de modo -->
          <div class="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              v-if="instanceId"
              type="button"
              class="px-3 py-1.5 rounded-lg transition"
              :class="
                activeTab === 'DILIGENCED'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              "
              @click="activeTab = 'DILIGENCED'"
            >
              📝 Formato Diligenciado
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg transition"
              :class="
                activeTab === 'ORIGINAL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              "
              @click="activeTab = 'ORIGINAL'"
            >
              🏛️ Formato Original Vacío
            </button>
          </div>

          <!-- Controles de Zoom -->
          <div class="hidden md:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl text-xs font-semibold text-slate-600">
            <button type="button" class="hover:text-slate-900 px-1" title="Reducir" @click="zoomOut">-</button>
            <span class="w-10 text-center font-mono text-[10px]">{{ zoomLevel }}%</span>
            <button type="button" class="hover:text-slate-900 px-1" title="Aumentar" @click="zoomIn">+</button>
            <button type="button" class="hover:text-slate-900 text-[10px] px-1 border-l border-slate-300 ml-1" @click="resetZoom">100%</button>
          </div>

          <!-- Botón de Descarga Oficial -->
          <button
            type="button"
            :disabled="downloading || (activeTab === 'DILIGENCED' && isNotDiligenced)"
            class="px-3 py-1.5 text-xs font-bold text-white bg-[#159c9a] hover:bg-[#128280] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            @click="handleDownload(activeTab)"
          >
            <span v-if="downloading">⏳ Descargando...</span>
            <span v-else-if="activeTab === 'DILIGENCED' && isAnexo5">⬇ Descargar DOCX</span>
            <span v-else>⬇ Descargar {{ activeTab === 'DILIGENCED' ? 'Diligenciado' : 'Original' }}</span>
          </button>

          <!-- Cerrar -->
          <button
            type="button"
            class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Barra informativa de fidelidad institucional -->
      <div
        class="px-5 py-2 text-[11px] font-medium flex items-center justify-between border-b shrink-0"
        :class="
          activeTab === 'ORIGINAL'
            ? 'bg-slate-100/70 border-slate-200 text-slate-600'
            : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
        "
      >
        <span v-if="activeTab === 'ORIGINAL'">
          ℹ️ Visualizando el formato institucional oficial en blanco (Vector PDF fiel de Regional 3).
        </span>
        <span v-else>
          ✅ Visualizando documento diligenciado sobre el formato institucional original con trazabilidad criptográfica.
        </span>
        <span class="font-mono text-[10px] hidden sm:inline">
          {{ isAnexo5 ? 'OpenXML DOCX / REVIEW_REQUIRED' : 'pdf-lib vector overlay' }}
        </span>
      </div>

      <!-- Alerta Anexo 5 DOCX nativo -->
      <div
        v-if="isAnexo5 && activeTab === 'DILIGENCED'"
        class="bg-amber-50 px-5 py-2 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between"
      >
        <span>
          ⚠️ <strong>Anexo 5 (Remisión de Muestras):</strong> Formato registrado como DOCX nativo (<code>REVIEW_REQUIRED</code>). Se genera mediante manipulación OpenXML y se descarga directamente.
        </span>
        <button
          type="button"
          class="underline font-bold text-amber-950 ml-3 shrink-0"
          @click="handleDownload('DILIGENCED')"
        >
          Descargar DOCX
        </button>
      </div>

      <!-- Área de visualización del documento -->
      <div class="flex-1 bg-slate-800 p-2 sm:p-4 overflow-auto flex items-center justify-center relative">
        <!-- Indicador de Carga -->
        <div v-if="loading" class="flex flex-col items-center justify-center text-white space-y-3">
          <div class="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-medium text-slate-300">Cargando documento institucional autenticado...</p>
        </div>

        <!-- Estado de No Diligenciado -->
        <div
          v-else-if="isNotDiligenced"
          class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 m-4"
        >
          <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto">
            📝
          </div>
          <h4 class="text-base font-bold text-slate-800">Documento sin información</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            Este documento todavía no tiene información diligenciada para generar su PDF.
          </p>
          <div class="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              @click="handleGoToDiligence"
            >
              Diligenciar documento
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
              @click="activeTab = 'ORIGINAL'"
            >
              Ver formato original en blanco
            </button>
          </div>
        </div>

        <!-- Estado de Error de Autenticación (401) -->
        <div
          v-else-if="isAuthError"
          class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 m-4"
        >
          <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto">
            🔒
          </div>
          <h4 class="text-base font-bold text-slate-800">Sesión Expirada</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            Su sesión ha expirado o no tiene permisos para consultar este documento. Por favor vuelva a iniciar sesión.
          </p>
          <button
            type="button"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            @click="emit('close')"
          >
            Cerrar visor
          </button>
        </div>

        <!-- Otro Error General -->
        <div
          v-else-if="error"
          class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 m-4"
        >
          <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <h4 class="text-base font-bold text-slate-800">Error al cargar</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{ error }}
          </p>
          <div class="flex gap-2 justify-center pt-2">
            <button
              type="button"
              class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition"
              @click="loadDocument"
            >
              Reintentar
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
              @click="emit('close')"
            >
              Cerrar
            </button>
          </div>
        </div>

        <!-- Visor Iframe con Blob Seguro -->
        <div
          v-else-if="activeBlobUrl"
          class="bg-white shadow-2xl transition-all duration-150 h-full w-full flex items-center justify-center rounded-lg overflow-hidden"
          :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }"
        >
          <iframe
            :src="activeIframeSrc"
            class="w-full h-full border-0 rounded-lg"
            title="Visor de Documento Institucional GODT"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>
