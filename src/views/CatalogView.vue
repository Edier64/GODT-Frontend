<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import InstitutionalDocumentViewerModal from "../components/InstitutionalDocumentViewerModal.vue";
import {
  getInstitutionalInventory,
  fetchOriginalTemplateBlob,
} from "../services/institutions";
import type { InstitutionalDocumentMetadata } from "../types/institutions";

const route = useRoute();
const donorId = computed(() =>
  typeof route.query.donorId === "string" ? route.query.donorId : "",
);

const loading = ref(true);
const error = ref("");
const inventory = ref<InstitutionalDocumentMetadata[]>([]);
const totalTemplates = ref(19);
const complementaryCount = ref(4);
const searchQuery = ref("");
const selectedFilter = ref<"ALL" | "GENERAL" | "ANEXO_7" | "COMPLEMENTARY" | "RESERVED">("ALL");

// Visor Modal
const showModal = ref(false);
const selectedDoc = ref<InstitutionalDocumentMetadata | null>(null);
const downloadingCode = ref<string | null>(null);

const RESERVED_POSITIONS = [
  { code: "POS_NORMATIVA_20", name: "Posición Normativa 20", status: "PENDING_HOMOLOGATION", note: "Reserva regulatoria INS Regional 3" },
  { code: "POS_NORMATIVA_21", name: "Posición Normativa 21", status: "PENDING_HOMOLOGATION", note: "Reserva regulatoria INS Regional 3" },
  { code: "POS_NORMATIVA_22", name: "Posición Normativa 22", status: "PENDING_HOMOLOGATION", note: "Reserva regulatoria INS Regional 3" },
  { code: "POS_NORMATIVA_23", name: "Posición Normativa 23", status: "PENDING_HOMOLOGATION", note: "Reserva regulatoria INS Regional 3" },
];

async function loadInventory() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getInstitutionalInventory();
    inventory.value = data.items || [];
    totalTemplates.value = data.totalTemplates || 19;
    complementaryCount.value = data.complementaryDocuments || 4;
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || "Error al cargar inventario institucional.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadInventory();
});

const officialTemplates = computed(() =>
  inventory.value.filter((i) => i.status !== "COMPLEMENTARY_SOURCE"),
);

const generalTemplates = computed(() =>
  officialTemplates.value.filter((i) => !i.documentCode.toLowerCase().startsWith("anexo_7_")),
);

const anexo7Templates = computed(() =>
  officialTemplates.value.filter((i) => i.documentCode.toLowerCase().startsWith("anexo_7_")),
);

const complementaryDocuments = computed(() =>
  inventory.value.filter((i) => i.status === "COMPLEMENTARY_SOURCE"),
);

const filteredItems = computed(() => {
  let list: InstitutionalDocumentMetadata[] = [];
  if (selectedFilter.value === "ALL") {
    list = officialTemplates.value;
  } else if (selectedFilter.value === "GENERAL") {
    list = generalTemplates.value;
  } else if (selectedFilter.value === "ANEXO_7") {
    list = anexo7Templates.value;
  } else if (selectedFilter.value === "COMPLEMENTARY") {
    list = complementaryDocuments.value;
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;

  return list.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.documentCode.toLowerCase().includes(q) ||
      item.filename.toLowerCase().includes(q),
  );
});

function openViewer(item: InstitutionalDocumentMetadata) {
  selectedDoc.value = item;
  showModal.value = true;
}

async function downloadOriginal(item: InstitutionalDocumentMetadata) {
  if (downloadingCode.value) return;
  downloadingCode.value = item.documentCode;

  try {
    const blob = await fetchOriginalTemplateBlob(item.documentCode, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Error al descargar el formato institucional original.");
  } finally {
    downloadingCode.value = null;
  }
}
</script>

<template>
  <section class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-[#159c9a]">
          Inventario Canónico Oficial
        </p>
        <h2 class="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17313b]">
          Catálogo Documental Institucional
        </h2>
        <p class="mt-1.5 text-xs sm:text-sm text-[#6b8790]">
          Repositorio central de los 19 formatos oficiales originales de Regional 3, sus 11 variantes de rescate y soportes clínicos.
        </p>
      </div>

      <!-- Barra de búsqueda -->
      <div class="w-full sm:w-72">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar anexo, código o palabra clave..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-[#cbdce2] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#159c9a]"
          />
          <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
      </div>
    </div>

    <!-- Pestañas de filtrado -->
    <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
        :class="
          selectedFilter === 'ALL'
            ? 'bg-[#123047] text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        "
        @click="selectedFilter = 'ALL'"
      >
        Todas las plantillas ({{ officialTemplates.length }})
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
        :class="
          selectedFilter === 'GENERAL'
            ? 'bg-[#123047] text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        "
        @click="selectedFilter = 'GENERAL'"
      >
        Anexos Generales ({{ generalTemplates.length }})
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
        :class="
          selectedFilter === 'ANEXO_7'
            ? 'bg-[#123047] text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        "
        @click="selectedFilter = 'ANEXO_7'"
      >
        Variantes Anexo 7 ({{ anexo7Templates.length }})
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
        :class="
          selectedFilter === 'COMPLEMENTARY'
            ? 'bg-[#123047] text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        "
        @click="selectedFilter = 'COMPLEMENTARY'"
      >
        Documentos Complementarios ({{ complementaryDocuments.length }})
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
        :class="
          selectedFilter === 'RESERVED'
            ? 'bg-[#123047] text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        "
        @click="selectedFilter = 'RESERVED'"
      >
        Posiciones 20–23 (Reservadas)
      </button>
    </div>

    <!-- Indicador de Carga / Error -->
    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-44 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
    </div>

    <div v-else-if="error" class="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
      <p class="font-bold">Error al consultar el catálogo institucional</p>
      <p class="mt-1 text-xs">{{ error }}</p>
    </div>

    <!-- Vista de Posiciones Reservadas (20 a 23) -->
    <div v-else-if="selectedFilter === 'RESERVED'" class="space-y-4">
      <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-900 space-y-2">
        <p class="font-bold text-sm text-amber-950 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Posiciones normativas reservadas (POS_NORMATIVA_20 a POS_NORMATIVA_23)</span>
        </p>
        <p class="leading-relaxed">
          Estas cuatro posiciones corresponden a espacios normativos canónicos en estado <code>PENDING_HOMOLOGATION</code> definidos por la Red Regional 3. No cuentan con un formato digital estandarizado activo ni deben confundirse con los soportes complementarios independientes.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="pos in RESERVED_POSITIONS"
          :key="pos.code"
          class="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs"
        >
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {{ pos.status }}
            </span>
            <span class="text-xs text-slate-400 font-mono">INS Reg3</span>
          </div>
          <div>
            <h4 class="font-bold text-sm text-slate-800">{{ pos.name }}</h4>
            <p class="text-xs font-mono text-slate-500 mt-0.5">{{ pos.code }}</p>
          </div>
          <p class="text-[11px] text-slate-500 leading-snug">
            {{ pos.note }}. Pendiente de homologación técnica por el Instituto Nacional de Salud.
          </p>
        </div>
      </div>
    </div>

    <!-- Grid de Plantillas / Documentos Filtrados -->
    <div v-else-if="filteredItems.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="item in filteredItems"
        :key="item.documentCode"
        class="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition hover:-translate-y-0.5 shadow-xs"
      >
        <div>
          <!-- Tags de encabezado -->
          <div class="flex items-center justify-between gap-2">
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="{
                'bg-emerald-100 text-emerald-800': item.status === 'OFFICIAL_HOMOLOGATED',
                'bg-indigo-100 text-indigo-800': item.status === 'INSTITUTIONAL_REGISTERED_TEMPLATE',
                'bg-purple-100 text-purple-800': item.status === 'COMPLEMENTARY_SOURCE',
                'bg-amber-100 text-amber-800': item.status === 'PENDING_HOMOLOGATION',
              }"
            >
              {{ item.status }}
            </span>
            <span
              class="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold"
              :class="item.mimeType === 'application/pdf' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'"
            >
              {{ item.mimeType === 'application/pdf' ? 'PDF' : 'DOCX' }}
            </span>
          </div>

          <!-- Título y Código -->
          <h3 class="mt-3 text-sm font-bold text-slate-900 leading-snug">
            {{ item.title }}
          </h3>
          <p class="mt-1 text-xs font-mono text-slate-500">
            {{ item.documentCode.toUpperCase() }}
          </p>

          <!-- Detalles técnicos -->
          <div class="mt-3.5 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-400">Páginas:</span>
              <span class="font-medium text-slate-700">{{ item.pageCount }} pág(s)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Modo de render:</span>
              <span class="font-mono text-[10px] text-slate-700">{{ item.renderMode }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Fidelidad técnica:</span>
              <span
                class="font-semibold text-[10px]"
                :class="item.fidelityStatus === 'RENDER_READY' ? 'text-emerald-700' : 'text-amber-700'"
              >
                {{ item.fidelityStatus }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            class="flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#123047] hover:bg-[#1c4767] text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            @click="openViewer(item)"
          >
            <span>🏛️</span>
            <span>Ver formato original</span>
          </button>

          <button
            type="button"
            :disabled="downloadingCode === item.documentCode"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center gap-1"
            title="Descargar archivo original oficial"
            @click="downloadOriginal(item)"
          >
            <span v-if="downloadingCode === item.documentCode">⏳</span>
            <span v-else>⬇</span>
            <span class="hidden sm:inline">Descargar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Vacío -->
    <div v-else class="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
      No se encontraron documentos en el catálogo para el criterio de búsqueda.
    </div>

    <!-- Modal de Visualización Institucional Oficial -->
    <InstitutionalDocumentViewerModal
      v-if="showModal && selectedDoc"
      :show="showModal"
      :document-code="selectedDoc.documentCode"
      :document-title="selectedDoc.title"
      :status="selectedDoc.status"
      initial-tab="ORIGINAL"
      @close="showModal = false"
    />
  </section>
</template>
