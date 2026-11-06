<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { documentLifecycleService } from "../services/documentLifecycle";
import type { GeneratedPdfDocument } from "../types/document-lifecycle";

const props = defineProps<{
  instanceId: string;
  snapshot: GeneratedPdfDocument;
  documentTitle?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const pdfBlobUrl = ref<string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref<"viewer" | "details">("viewer");

async function loadPdf() {
  loading.value = true;
  error.value = null;
  try {
    const blob = await documentLifecycleService.downloadPdfBlob(
      props.instanceId,
      props.snapshot.id,
    );
    const url = URL.createObjectURL(blob);
    pdfBlobUrl.value = url;
  } catch (err: any) {
    error.value = err?.message || "Error al descargar el archivo PDF oficial.";
  } finally {
    loading.value = false;
  }
}

function handleDownload() {
  if (!pdfBlobUrl.value) return;
  const a = document.createElement("a");
  a.href = pdfBlobUrl.value;
  a.download = `${props.documentTitle || "documento"}-v${props.snapshot.versionNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function copyHash() {
  navigator.clipboard.writeText(props.snapshot.sha256Hash);
  alert("Hash SHA-256 copiado al portapapeles.");
}

onMounted(() => {
  loadPdf();
});

onUnmounted(() => {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value);
  }
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      class="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xl font-bold"
          >
            📄
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-800">
                {{ documentTitle || "Documento Oficial" }}
              </h3>
              <span
                class="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800"
              >
                v{{ snapshot.versionNumber }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="
                  snapshot.status === 'RELEASED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                {{ snapshot.status }}
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono mt-0.5">
              SHA-256: {{ snapshot.sha256Hash?.slice(0, 16) }}...
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Pestañas -->
          <div class="flex rounded-lg bg-slate-200 p-0.5 text-xs font-medium">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 transition-colors"
              :class="
                activeTab === 'viewer'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              "
              @click="activeTab = 'viewer'"
            >
              Visualizador
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 transition-colors"
              :class="
                activeTab === 'details'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              "
              @click="activeTab = 'details'"
            >
              Metadatos y Hash
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-[#123047] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3f5c] disabled:opacity-50"
            :disabled="!pdfBlobUrl"
            @click="handleDownload"
          >
            <span>⬇</span>
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Contenido Principal -->
      <div class="relative flex-1 bg-slate-100">
        <!-- Tab 1: Visualizador PDF -->
        <div v-show="activeTab === 'viewer'" class="h-full w-full">
          <div
            v-if="loading"
            class="flex h-full items-center justify-center text-slate-500 text-sm"
          >
            <span class="mr-2 animate-spin">⏳</span>
            Generando flujo protegido del documento PDF...
          </div>
          <div
            v-else-if="error"
            class="flex h-full flex-col items-center justify-center p-6 text-center text-rose-700"
          >
            <p class="font-semibold">{{ error }}</p>
            <button
              class="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white"
              @click="loadPdf"
            >
              Reintentar
            </button>
          </div>
          <iframe
            v-else-if="pdfBlobUrl"
            :src="pdfBlobUrl"
            class="h-full w-full border-none"
            title="Visualizador PDF Oficial"
          />
        </div>

        <!-- Tab 2: Metadatos e Integridad -->
        <div
          v-show="activeTab === 'details'"
          class="h-full overflow-y-auto bg-white p-6 space-y-5"
        >
          <div>
            <h4 class="text-sm font-bold text-slate-800">
              Certificado de Integridad Criptográfica
            </h4>
            <p class="text-xs text-slate-500">
              Este snapshot documental ha sido congelado de manera inmutable y protegido mediante función resumen criptográfica SHA-256.
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <p class="text-xs font-semibold text-slate-600">Huella Digital (SHA-256 Completa):</p>
              <div class="mt-1 flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200 font-mono text-xs text-slate-800 break-all">
                <span>{{ snapshot.sha256Hash }}</span>
                <button
                  type="button"
                  class="ml-2 shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-sans text-slate-600 hover:bg-slate-200"
                  @click="copyHash"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="font-semibold text-slate-600">ID de Snapshot:</span>
                <p class="font-mono text-slate-800">{{ snapshot.id }}</p>
              </div>
              <div>
                <span class="font-semibold text-slate-600">Fecha y Hora de Emisión:</span>
                <p class="text-slate-800">{{ new Date(snapshot.generatedAt).toLocaleString() }}</p>
              </div>
              <div>
                <span class="font-semibold text-slate-600">Tamaño del Archivo:</span>
                <p class="text-slate-800">{{ (snapshot.fileSizeBytes / 1024).toFixed(1) }} KB</p>
              </div>
              <div>
                <span class="font-semibold text-slate-600">Versión del Snapshot:</span>
                <p class="text-slate-800">Revisión formal v{{ snapshot.versionNumber }}</p>
              </div>
            </div>
          </div>

          <!-- Firmas registradas asociadas al snapshot -->
          <div>
            <h5 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Firmas y Atestaciones Vinculadas
            </h5>
            <div
              v-if="!snapshot.signatures || snapshot.signatures.length === 0"
              class="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500"
            >
              No se han estampado firmas sobre este snapshot aún.
            </div>
            <div v-else class="mt-2 space-y-2">
              <div
                v-for="sig in snapshot.signatures"
                :key="sig.id"
                class="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-xs"
              >
                <div>
                  <p class="font-bold text-teal-950">{{ sig.signerName }}</p>
                  <p class="text-teal-700">
                    {{ sig.signerRole }} · {{ sig.signerDocumentType }} {{ sig.signerDocumentNumber }}
                    <span v-if="sig.signerProfessionalId">· RM: {{ sig.signerProfessionalId }}</span>
                  </p>
                  <p class="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Verificación: {{ sig.verificationHash?.slice(0, 20) }}...
                  </p>
                </div>
                <div class="text-right">
                  <span class="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                    {{ sig.signatureType }}
                  </span>
                  <p class="text-[11px] text-slate-500 mt-1">
                    {{ new Date(sig.signedAt).toLocaleString() }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
