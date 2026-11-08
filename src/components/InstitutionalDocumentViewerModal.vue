<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  getOriginalTemplateFileUrl,
  getPreviewPdfUrl,
} from "../services/institutions";

const props = defineProps<{
  show: boolean;
  documentCode: string;
  instanceId?: string;
  documentTitle: string;
  status?: string;
  revisionNumber?: number;
  initialTab?: "ORIGINAL" | "DILIGENCED";
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const activeTab = ref<"ORIGINAL" | "DILIGENCED">(props.initialTab || "ORIGINAL");
const zoomLevel = ref<number>(100);

watch(
  () => props.initialTab,
  (newTab) => {
    if (newTab) activeTab.value = newTab;
  },
);

watch(
  () => props.show,
  (newShow) => {
    if (newShow && props.initialTab) {
      activeTab.value = props.initialTab;
    }
  },
);

const originalUrl = computed(() => {
  return getOriginalTemplateFileUrl(props.documentCode);
});

const previewUrl = computed(() => {
  if (!props.instanceId) return "";
  return getPreviewPdfUrl(props.instanceId);
});

const activeIframeSrc = computed(() => {
  if (activeTab.value === "DILIGENCED" && previewUrl.value) {
    return `${previewUrl.value}#toolbar=0&view=FitH`;
  }
  return `${originalUrl.value}#toolbar=0&view=FitH`;
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

function handleDownload(type: "ORIGINAL" | "DILIGENCED") {
  if (type === "ORIGINAL") {
    window.open(getOriginalTemplateFileUrl(props.documentCode, true), "_blank");
  } else if (props.instanceId) {
    window.open(getPreviewPdfUrl(props.instanceId, true), "_blank");
  }
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
            class="px-3 py-1.5 text-xs font-bold text-white bg-[#159c9a] hover:bg-[#128280] rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            @click="handleDownload(activeTab)"
          >
            <span>⬇ Descargar PDF</span>
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
          pdf-lib vector overlay
        </span>
      </div>

      <!-- Área de visualización del documento -->
      <div class="flex-1 bg-slate-800 p-2 sm:p-4 overflow-auto flex items-center justify-center">
        <div
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
