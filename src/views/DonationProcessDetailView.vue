<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../components/AppLayout.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { useDonationProcessController } from "../controllers/useDonationProcessController";
import type {
  DependencyEvaluationResult,
  DocumentApplicability,
  DonationProcessStatus,
  ProcessDocument,
  ProcessInstitutionRole,
  ProcessParticipantRole,
} from "../types/donation-process";
import {
  getProcessCanonicalValues,
  getProcessCanonicalHistory,
  resolveCanonicalConflict,
} from "../services/canonical";
import type {
  ProcessCanonicalValue,
  ProcessCanonicalHistory,
  ConflictResolutionStrategy,
} from "../types/canonical";
import PdfViewerModal from "../components/PdfViewerModal.vue";
import { documentLifecycleService } from "../services/documentLifecycle";
import type { GeneratedPdfDocument } from "../types/document-lifecycle";
import { getApiError } from "../services/api";
import { dossierService } from "../services/dossier";
import type {
  DossierExportType,
  DossierManifest,
  IntegrityVerificationReport,
  ProcessDossierExport,
} from "../types/dossier";

const route = useRoute();
const router = useRouter();
const processId = computed(() => route.params.processId as string);

const {
  currentProcess,
  documentsSummary,
  loading,
  loadingDocuments,
  error,
  loadProcess,
  loadDocuments,
  changeStatus,
  changeApplicability,
  initiateDocument,
  checkDependencies,
  attachInstitution,
  attachParticipant,
} = useDonationProcessController();

const showInstModal = ref(false);
const showPartModal = ref(false);
const showApplicabilityModal = ref(false);
const showDependenciesModal = ref(false);
const showHomologationNoticeModal = ref(false);

const selectedDocForApplicability = ref<ProcessDocument | null>(null);
const applicabilityForm = reactive({
  applicabilityStatus: "APLICABLE" as DocumentApplicability,
  nonApplicabilityReason: "",
});

const dependencyResult = ref<DependencyEvaluationResult | null>(null);
const evaluatingDoc = ref<ProcessDocument | null>(null);
const noticeDoc = ref<ProcessDocument | null>(null);

const activeCategoryFilter = ref<string>("ALL");

const instForm = reactive({
  institutionName: "",
  role: "IPS_EXTRACTORA" as ProcessInstitutionRole,
  notes: "",
});

const partForm = reactive({
  fullName: "",
  role: "CIRUJANO_RESCATE" as ProcessParticipantRole,
  documentType: "CC",
  documentNumber: "",
  professionalId: "",
  institution: "",
  relationshipToDonor: "",
  phone: "",
  email: "",
  notes: "",
});

const activeMainTab = ref<"PACKAGE" | "CANONICAL" | "DOSSIER">("PACKAGE");
const canonicalValues = ref<ProcessCanonicalValue[]>([]);
const loadingCanonical = ref(false);
const canonicalError = ref("");
const conflictsCount = computed(
  () =>
    canonicalValues.value.filter(
      (v) => v.conflictStatus === "CONFLICT_DETECTED",
    ).length,
);

// --- ESTADO FASE E: EXPEDIENTE CONSOLIDADO ---
const dossierExports = ref<ProcessDossierExport[]>([]);
const loadingDossier = ref(false);
const dossierError = ref("");
const activeExport = ref<ProcessDossierExport | null>(null);
const pollingInterval = ref<any>(null);

const showRequestExportModal = ref(false);
const requestExportForm = reactive({
  exportType: "FULL_ZIP" as DossierExportType,
  includeSourceDocuments: false,
  confirmSensitiveNotice: false,
});
const requestingExport = ref(false);

const showManifestModal = ref(false);
const currentManifest = ref<DossierManifest | null>(null);
const loadingManifest = ref(false);

const showVerificationModal = ref(false);
const verificationReport = ref<IntegrityVerificationReport | null>(null);
const verifyingIntegrity = ref(false);

const packageMetrics = computed(() => {
  const docs = documentsSummary.value?.documents || [];
  const total = docs.length || 23;
  const pendingHomologation = docs.filter((d) => d.category === "PENDING_HOMOLOGATION").length;
  const nonApplicable = docs.filter((d) => d.applicabilityStatus === "NO_APLICA").length;
  // Posiciones operativas normativas homologadas
  const normativeOperational = docs.filter((d) => d.category !== "PENDING_HOMOLOGATION");
  const applicableOperational = normativeOperational.filter((d) => d.applicabilityStatus !== "NO_APLICA");
  const completed = docs.filter((d) => d.status === "COMPLETADO").length;
  const signed = docs.filter((d) => (d.status as string) === "FIRMADO" || (d.status as string) === "LIBERADO").length;
  const inProgress = docs.filter((d) =>
    ["EN_DILIGENCIAMIENTO", "EN_REVISION", "BLOQUEADO", "VALIDADO"].includes(d.status as string),
  ).length;
  const pending = docs.filter(
    (d) =>
      d.status === "PENDIENTE" &&
      d.applicabilityStatus !== "NO_APLICA" &&
      d.category !== "PENDING_HOMOLOGATION",
  ).length;

  const applicableCount = applicableOperational.length;
  const finishedCount = completed + signed;
  const percentage =
    applicableCount > 0 ? Math.round((finishedCount / applicableCount) * 100) : 0;

  return {
    total,
    pendingHomologation,
    nonApplicable,
    applicableCount,
    completed,
    signed,
    inProgress,
    pending,
    percentage,
  };
});

const showHistoryModal = ref(false);
const historyTitle = ref("");
const historyEntries = ref<ProcessCanonicalHistory[]>([]);
const loadingHistory = ref(false);

const showProcessConflictModal = ref(false);
const resolvingField = ref<ProcessCanonicalValue | null>(null);
const processConflictForm = reactive({
  strategy: "ACCEPT_CANDIDATE" as ConflictResolutionStrategy,
  manualValue: "",
  justification: "",
});
const resolvingProcessConflict = ref(false);

const selectedProcessPdfSnapshot = ref<GeneratedPdfDocument | null>(null);
const selectedProcessPdfDocTitle = ref("");
const selectedProcessInstanceId = ref("");
const showProcessPdfModal = ref(false);
const loadingPdfSnapshot = ref(false);

async function handleViewDocumentPdf(doc: ProcessDocument) {
  if (!doc.currentInstanceId) return;
  loadingPdfSnapshot.value = true;
  try {
    const snaps = await documentLifecycleService.listSnapshots(doc.currentInstanceId);
    if (!snaps || snaps.length === 0) {
      alert(
        `La posición "${doc.title}" aún no cuenta con un snapshot PDF generado. Ingrese a diligenciar el documento y genere su snapshot formal.`
      );
      return;
    }
    selectedProcessPdfSnapshot.value = snaps[0];
    selectedProcessPdfDocTitle.value = doc.title;
    selectedProcessInstanceId.value = doc.currentInstanceId;
    showProcessPdfModal.value = true;
  } catch (err: any) {
    alert(getApiError(err));
  } finally {
    loadingPdfSnapshot.value = false;
  }
}

async function loadCanonical() {
  if (!processId.value) return;
  loadingCanonical.value = true;
  canonicalError.value = "";
  try {
    canonicalValues.value = await getProcessCanonicalValues(processId.value);
  } catch (err: any) {
    canonicalError.value = getApiError(err);
  } finally {
    loadingCanonical.value = false;
  }
}

async function switchToCanonicalTab() {
  activeMainTab.value = "CANONICAL";
  await loadCanonical();
}

async function handleViewHistory(val: ProcessCanonicalValue) {
  if (!processId.value) return;
  historyTitle.value = val.fieldDefinition?.displayName || val.canonicalFieldKey;
  loadingHistory.value = true;
  showHistoryModal.value = true;
  try {
    historyEntries.value = await getProcessCanonicalHistory(
      processId.value,
      val.canonicalFieldKey,
    );
  } catch (err: any) {
    alert(getApiError(err));
  } finally {
    loadingHistory.value = false;
  }
}

function handleOpenProcessConflictModal(val: ProcessCanonicalValue) {
  resolvingField.value = val;
  processConflictForm.strategy = "ACCEPT_CANDIDATE";
  processConflictForm.manualValue = "";
  processConflictForm.justification = "";
  showProcessConflictModal.value = true;
}

async function handleConfirmProcessConflict() {
  if (!resolvingField.value || !processId.value) return;
  if (!processConflictForm.justification.trim()) {
    alert("Se requiere justificación para resolver la divergencia.");
    return;
  }
  resolvingProcessConflict.value = true;
  try {
    await resolveCanonicalConflict(processId.value, {
      canonicalFieldKey: resolvingField.value.canonicalFieldKey,
      strategy: processConflictForm.strategy,
      manualValue:
        processConflictForm.strategy === "MANUAL_OVERRIDE"
          ? processConflictForm.manualValue
          : undefined,
      justification: processConflictForm.justification.trim(),
    });
    showProcessConflictModal.value = false;
    resolvingField.value = null;
    await loadCanonical();
  } catch (err: any) {
    alert(getApiError(err));
  } finally {
    resolvingProcessConflict.value = false;
  }
}

function formatCanonicalValue(val: unknown, dataType: string): string {
  if (val === null || val === undefined || val === "") return "—";
  if (dataType === "DATETIME" && typeof val === "string") {
    return formatDate(val);
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return String(val);
}

// --- MÉTODOS FASE E: EXPEDIENTE CONSOLIDADO ---
async function loadDossierExports() {
  if (!processId.value) return;
  loadingDossier.value = true;
  dossierError.value = "";
  try {
    const list = await dossierService.listExports(processId.value);
    dossierExports.value = list;
    const running = list.find((e) => e.status === "PENDING" || e.status === "PROCESSING");
    if (running) {
      activeExport.value = running;
      startDossierPolling(running.id);
    } else {
      activeExport.value = null;
      stopDossierPolling();
    }
  } catch (err: any) {
    dossierError.value = getApiError(err);
  } finally {
    loadingDossier.value = false;
  }
}

function startDossierPolling(exportId: string) {
  if (pollingInterval.value) clearInterval(pollingInterval.value);
  pollingInterval.value = setInterval(async () => {
    try {
      const exp = await dossierService.getExport(processId.value, exportId);
      activeExport.value = exp;
      if (exp.status === "COMPLETED" || exp.status === "FAILED") {
        stopDossierPolling();
        await loadDossierExports();
      }
    } catch {
      stopDossierPolling();
    }
  }, 2500);
}

function stopDossierPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
  }
}

async function switchToDossierTab() {
  activeMainTab.value = "DOSSIER";
  await loadDossierExports();
}

function handleOpenRequestExportModal() {
  requestExportForm.exportType = "FULL_ZIP";
  requestExportForm.includeSourceDocuments = false;
  requestExportForm.confirmSensitiveNotice = false;
  showRequestExportModal.value = true;
}

async function handleConfirmRequestExport() {
  if (!processId.value) return;
  if (requestExportForm.includeSourceDocuments && !requestExportForm.confirmSensitiveNotice) {
    alert(
      "Debe confirmar expresamente la autorización para exportar historias clínicas y documentos complementarios.",
    );
    return;
  }

  requestingExport.value = true;
  try {
    const exp = await dossierService.requestExport(processId.value, {
      exportType: requestExportForm.exportType,
      includeSourceDocuments: requestExportForm.includeSourceDocuments,
    });
    showRequestExportModal.value = false;
    activeExport.value = exp;
    await loadDossierExports();
    startDossierPolling(exp.id);
  } catch (err: any) {
    alert(getApiError(err));
  } finally {
    requestingExport.value = false;
  }
}

async function handleDownloadZip(exp: ProcessDossierExport) {
  try {
    const blob = await dossierService.downloadZip(processId.value, exp.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GODT_EXPEDIENTE_${currentProcess.value?.processCode || processId.value}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(getApiError(err));
  }
}

async function handleDownloadConsolidatedPdf(exp: ProcessDossierExport) {
  try {
    const blob = await dossierService.downloadConsolidatedPdf(processId.value, exp.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expediente_consolidado_${currentProcess.value?.processCode || processId.value}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(getApiError(err));
  }
}

async function handleViewManifest(exp: ProcessDossierExport) {
  loadingManifest.value = true;
  showManifestModal.value = true;
  try {
    if (exp.manifestData) {
      currentManifest.value = exp.manifestData;
    } else {
      currentManifest.value = await dossierService.getManifest(processId.value, exp.id);
    }
  } catch (err: any) {
    alert(getApiError(err));
    showManifestModal.value = false;
  } finally {
    loadingManifest.value = false;
  }
}

async function handleVerifyIntegrity(exp: ProcessDossierExport) {
  verifyingIntegrity.value = true;
  showVerificationModal.value = true;
  verificationReport.value = null;
  try {
    verificationReport.value = await dossierService.verifyIntegrity(processId.value, exp.id);
  } catch (err: any) {
    alert(getApiError(err));
    showVerificationModal.value = false;
  } finally {
    verifyingIntegrity.value = false;
  }
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = 2;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

onMounted(async () => {
  if (processId.value) {
    await loadProcess(processId.value);
    await loadDocuments(processId.value);
    await loadCanonical();
    await loadDossierExports();
  }
});

onUnmounted(() => {
  stopDossierPolling();
});

const filteredDocuments = computed(() => {
  if (!documentsSummary.value?.documents) return [];
  if (activeCategoryFilter.value === "ALL") {
    return documentsSummary.value.documents;
  }
  if (activeCategoryFilter.value === "NO_APLICA") {
    return documentsSummary.value.documents.filter(
      (d) => d.applicabilityStatus === "NO_APLICA",
    );
  }
  return documentsSummary.value.documents.filter(
    (d) => d.category === activeCategoryFilter.value,
  );
});

async function onStatusChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  const newStatus = select.value as DonationProcessStatus;
  if (!newStatus || !currentProcess.value) return;
  await changeStatus(currentProcess.value.id, newStatus);
}

async function handleAddInstitution() {
  if (!instForm.institutionName || !currentProcess.value) return;
  const ok = await attachInstitution(currentProcess.value.id, {
    institutionName: instForm.institutionName,
    role: instForm.role,
    notes: instForm.notes.trim() || undefined,
  });
  if (ok) {
    showInstModal.value = false;
    instForm.institutionName = "";
    instForm.notes = "";
  }
}

async function handleAddParticipant() {
  if (!partForm.fullName || !currentProcess.value) return;
  const ok = await attachParticipant(currentProcess.value.id, {
    fullName: partForm.fullName,
    role: partForm.role,
    documentType: partForm.documentType || undefined,
    documentNumber: partForm.documentNumber.trim() || undefined,
    professionalId: partForm.professionalId.trim() || undefined,
    institution: partForm.institution.trim() || undefined,
    relationshipToDonor: partForm.relationshipToDonor.trim() || undefined,
    phone: partForm.phone.trim() || undefined,
    email: partForm.email.trim() || undefined,
    notes: partForm.notes.trim() || undefined,
  });
  if (ok) {
    showPartModal.value = false;
    partForm.fullName = "";
    partForm.documentNumber = "";
    partForm.professionalId = "";
    partForm.institution = "";
    partForm.notes = "";
  }
}

function openApplicabilityModal(doc: ProcessDocument) {
  selectedDocForApplicability.value = doc;
  applicabilityForm.applicabilityStatus = doc.applicabilityStatus;
  applicabilityForm.nonApplicabilityReason = doc.nonApplicabilityReason || "";
  showApplicabilityModal.value = true;
}

async function handleSaveApplicability() {
  if (!selectedDocForApplicability.value || !currentProcess.value) return;
  if (
    applicabilityForm.applicabilityStatus === "NO_APLICA" &&
    !applicabilityForm.nonApplicabilityReason.trim()
  ) {
    alert("Se requiere una justificación clínica o normativa para marcar como NO APLICA.");
    return;
  }

  const res = await changeApplicability(
    currentProcess.value.id,
    selectedDocForApplicability.value.id,
    {
      applicabilityStatus: applicabilityForm.applicabilityStatus,
      nonApplicabilityReason: applicabilityForm.nonApplicabilityReason.trim() || undefined,
    },
  );

  if (res) {
    showApplicabilityModal.value = false;
    selectedDocForApplicability.value = null;
  }
}

async function handleOpenOrInitiateDocument(doc: ProcessDocument) {
  if (!currentProcess.value) return;

  if (doc.applicabilityStatus === "NO_APLICA") {
    alert("Esta posición está marcada como NO APLICA en este proceso de donación.");
    return;
  }

  if (doc.category === "PENDING_HOMOLOGATION") {
    noticeDoc.value = doc;
    showHomologationNoticeModal.value = true;
    return;
  }

  if (doc.currentInstanceId) {
    router.push(
      `/expedientes/${currentProcess.value.donorId}/instancias/${doc.currentInstanceId}`,
    );
    return;
  }

  const res = await initiateDocument(currentProcess.value.id, doc.id);
  if (res && res.instanceId) {
    router.push(
      `/expedientes/${currentProcess.value.donorId}/instancias/${res.instanceId}`,
    );
  } else {
    alert(
      error.value ||
        "No se pudo iniciar la instancia documental. Verifique si existe plantilla publicada.",
    );
  }
}

async function handleCheckDependencies(doc: ProcessDocument) {
  if (!currentProcess.value) return;
  evaluatingDoc.value = doc;
  const res = await checkDependencies(currentProcess.value.id, doc.id);
  if (res) {
    dependencyResult.value = res;
    showDependenciesModal.value = true;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "CLINICAL":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "LEGAL":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "SURGERY":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ORGAN":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "TISSUE":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "CUSTODY":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "PENDING_HOMOLOGATION":
      return "bg-slate-100 text-slate-700 border-slate-300";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function formatDate(iso?: string | null): string {
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
  <div class="max-w-7xl mx-auto space-y-6 pb-12 w-full min-w-0">
      <!-- Barra superior / Header Responsivo (UI-02) -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3">
          <button
            type="button"
            class="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            @click="router.push('/procesos')"
            title="Volver al listado de procesos"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-xl sm:text-2xl font-bold font-mono text-slate-900 break-all">
                {{ currentProcess?.processCode || "Cargando proceso..." }}
              </h1>
              <StatusBadge v-if="currentProcess" :status="currentProcess.status" />
              <span
                v-if="currentProcess?.donor?.rndCode"
                class="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200"
              >
                RND: {{ currentProcess.donor.rndCode }}
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Aperturado el {{ formatDate(currentProcess?.openedAt) }} · {{ currentProcess?.primaryIpsName }}
            </p>
          </div>
        </div>

        <!-- Acciones Rápidas y Selector de Estado Responsivo -->
        <div v-if="currentProcess" class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              @click="showInstModal = true"
            >
              <span>🏥</span>
              <span>+ Institución</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              @click="showPartModal = true"
            >
              <span>👤</span>
              <span>+ Participante</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Estado:</label>
            <select
              :value="currentProcess.status"
              class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              @change="onStatusChange"
            >
              <option value="EN_VALORACION">En Valoración</option>
              <option value="EN_CURSO">En Curso</option>
              <option value="COMPLETADO">Completado</option>
              <option value="SUSPENDIDO">Suspendido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Alerta de Error -->
      <div v-if="error" class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
        {{ error }}
      </div>

      <!-- Ficha del Donante Asociado -->
      <div v-if="currentProcess?.donor" class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Expediente del Donante
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div class="text-xs text-slate-400">Nombre Completo</div>
            <div class="text-base font-semibold text-slate-800">{{ currentProcess.donor.fullName }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Código RND</div>
            <div class="text-base font-mono font-medium text-indigo-600">{{ currentProcess.donor.rndCode }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Documento de Identidad</div>
            <div class="text-base font-medium text-slate-700">{{ currentProcess.donor.documentNumber }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">IPS Generadora / Origen</div>
            <div class="text-base font-medium text-slate-700">{{ currentProcess.donor.originatingIpsName }}</div>
          </div>
        </div>
      </div>

      <!-- Selector de Pestaña Principal: Paquete Documental vs Marcadores Canónicos -->
      <div class="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          class="px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2"
          :class="activeMainTab === 'PACKAGE' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="activeMainTab = 'PACKAGE'"
        >
          <span>📁 Paquete Documental (23 Posiciones)</span>
        </button>
        <button
          type="button"
          class="px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2"
          :class="activeMainTab === 'CANONICAL' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="switchToCanonicalTab"
        >
          <span>🔄 Marcadores Canónicos y Propagación (Fase C)</span>
          <span
            v-if="conflictsCount > 0"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse"
          >
            {{ conflictsCount }} conflicto(s)
          </span>
        </button>
        <button
          type="button"
          class="px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2"
          :class="activeMainTab === 'DOSSIER' ? 'border-indigo-600 text-indigo-700 bg-white font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="switchToDossierTab"
        >
          <span>📦 Expediente Consolidado (Fase E)</span>
          <span
            v-if="activeExport && (activeExport.status === 'PROCESSING' || activeExport.status === 'PENDING')"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse"
          >
            {{ activeExport.progressPercent }}%
          </span>
        </button>
      </div>

      <!-- SECCIÓN FASE B: PAQUETE DOCUMENTAL DE 23 POSICIONES -->
      <div v-if="activeMainTab === 'PACKAGE'" class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div class="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-800">
                Paquete Documental Operativo — Regional 3 (23 Posiciones)
              </h2>
              <span class="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                Piloto v1.0.0 (Homologación Parcial 19/23)
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Paquete normativo administrado por proceso. Avance = (Completados + Firmados) / Aplicables × 100. Las posiciones descartadas (NO APLICA) se justifican y no reducen el porcentaje.
            </p>
          </div>

          <!-- Barra de Progreso y Métricas Rápidas (UI-03) -->
          <div v-if="documentsSummary" class="flex flex-col sm:flex-row items-center gap-4 flex-wrap 2xl:flex-nowrap w-full 2xl:w-auto justify-end">
            <div class="w-full sm:w-56 space-y-1.5 shrink-0">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-slate-600">Avance Normativo</span>
                <span class="text-indigo-600 font-mono font-bold">{{ packageMetrics.percentage }}%</span>
              </div>
              <div
                class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner cursor-help"
                :title="`Avance = (${packageMetrics.completed} Completados + ${packageMetrics.signed} Firmados) / ${packageMetrics.applicableCount} Aplicables × 100`"
              >
                <div
                  class="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  :style="{ width: `${packageMetrics.percentage}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{{ packageMetrics.completed + packageMetrics.signed }} de {{ packageMetrics.applicableCount }} listos</span>
                <span>{{ packageMetrics.pendingHomologation }} en homologación</span>
              </div>
            </div>

            <!-- Desglose de 6 Métricas Claras -->
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs w-full sm:w-auto">
              <div class="p-2 bg-slate-50 rounded-lg border border-slate-200" title="Total de 23 posiciones previstas en el paquete regional">
                <div class="text-slate-400 text-[10px] uppercase font-bold">Total</div>
                <div class="font-bold text-slate-800 font-mono">{{ packageMetrics.total }}</div>
              </div>
              <div class="p-2 bg-blue-50/70 rounded-lg border border-blue-200" title="Posiciones normativas con aplicabilidad activa en este proceso">
                <div class="text-blue-600 text-[10px] uppercase font-bold">Aplicables</div>
                <div class="font-bold text-blue-800 font-mono">{{ packageMetrics.applicableCount }}</div>
              </div>
              <div class="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200" title="Documentos con diligenciamiento completo y validado">
                <div class="text-emerald-600 text-[10px] uppercase font-bold">Completos</div>
                <div class="font-bold text-emerald-800 font-mono">{{ packageMetrics.completed }}</div>
              </div>
              <div class="p-2 bg-teal-50/70 rounded-lg border border-teal-200" title="Documentos con snapshot oficial firmado o liberado">
                <div class="text-teal-600 text-[10px] uppercase font-bold">Firmados</div>
                <div class="font-bold text-teal-800 font-mono">{{ packageMetrics.signed }}</div>
              </div>
              <div class="p-2 bg-zinc-100 rounded-lg border border-zinc-200" title="Posiciones justificadas que no aplican a este donante específico">
                <div class="text-zinc-600 text-[10px] uppercase font-bold">No Aplica</div>
                <div class="font-bold text-zinc-700 font-mono">{{ packageMetrics.nonApplicable }}</div>
              </div>
              <div class="p-2 bg-amber-50/80 rounded-lg border border-amber-200" title="Posiciones 20 a 23 en proceso de homologación institucional">
                <div class="text-amber-700 text-[10px] uppercase font-bold">Pend. Homol.</div>
                <div class="font-bold text-amber-900 font-mono">{{ packageMetrics.pendingHomologation }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Leyenda desglosada y fórmula de avance (UI-03) -->
        <div class="text-xs text-slate-600 bg-slate-50/90 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-base">📊</span>
            <div>
              <strong class="text-slate-800">Fórmula de Avance Normativo:</strong>
              <span class="font-mono text-indigo-700 font-semibold ml-1">
                ({{ packageMetrics.completed }} Completos + {{ packageMetrics.signed }} Firmados) / {{ packageMetrics.applicableCount }} Aplicables = {{ packageMetrics.percentage }}%
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-[11px] text-slate-500">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span> 19 Normativos
            </span>
            <span>•</span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span> 4 Pendientes (Pos 20-23)
            </span>
            <span>•</span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-zinc-400"></span> {{ packageMetrics.nonApplicable }} No Aplica
            </span>
          </div>
        </div>

        <!-- Banner de Homologación Institucional en Curso -->
        <div class="p-3 bg-amber-50/80 border border-amber-200/90 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2">
          <span class="text-base leading-none">ℹ️</span>
          <div>
            <strong class="font-semibold">Estado de Homologación:</strong> El paquete incluye 19 posiciones normativas con correspondencia oficial demostrada (Anexos 1 al 9 y sus variantes de tejidos y órganos) y 4 posiciones reservadas en estado <strong class="font-semibold text-amber-950">Pendiente de Homologación</strong> (Posiciones 20 a 23). Las historias clínicas hospitalarias y cálculos de hemodilución no son anexos normativos y se preservan como <strong class="font-semibold text-amber-950">Documentos Fuente</strong>.
          </div>
        </div>

        <!-- Filtros por Categoría -->
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'ALL'"
          >
            Todos (23)
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'CLINICAL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'CLINICAL'"
          >
            Clínicos
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'LEGAL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'LEGAL'"
          >
            Legales
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'SURGERY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'SURGERY'"
          >
            Quirúrgicos
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'TISSUE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'TISSUE'"
          >
            Tejidos
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'ORGAN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'ORGAN'"
          >
            Órganos
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'PENDING_HOMOLOGATION' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'PENDING_HOMOLOGATION'"
          >
            Pendientes Homologación (4)
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
            :class="activeCategoryFilter === 'NO_APLICA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeCategoryFilter = 'NO_APLICA'"
          >
            Descartados (No Aplica)
          </button>
        </div>

        <div v-if="loadingDocuments" class="py-12 text-center text-slate-400 text-sm">
          Cargando posiciones del paquete documental...
        </div>

        <!-- Grid de las 23 Posiciones -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="p-4 rounded-xl border transition-all duration-200 space-y-3 flex flex-col justify-between"
            :class="doc.applicabilityStatus === 'NO_APLICA'
              ? 'bg-zinc-50 border-zinc-200 opacity-60'
              : 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                  Posición {{ String(doc.positionNumber).padStart(2, '0') }}
                </span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                  :class="getCategoryColor(doc.category)"
                >
                  {{ doc.category }}
                </span>
              </div>

              <div>
                <div class="font-bold text-sm text-slate-900 leading-snug">
                  {{ doc.title }}
                </div>
                <div class="text-xs font-mono text-slate-400 mt-0.5">
                  {{ doc.documentCode }}
                </div>
              </div>

              <!-- Banner de Homologación Pendiente -->
              <div
                v-if="doc.category === 'PENDING_HOMOLOGATION'"
                class="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5"
              >
                <span class="font-bold">⚠️</span>
                <span>Pendiente de homologación institucional por la coordinación regional.</span>
              </div>

              <!-- Justificación NO APLICA -->
              <div
                v-if="doc.applicabilityStatus === 'NO_APLICA' && doc.nonApplicabilityReason"
                class="p-2 bg-zinc-100 border border-zinc-300 rounded-lg text-[11px] text-zinc-700 italic"
              >
                <span class="font-semibold text-zinc-900 not-italic">Motivo:</span> {{ doc.nonApplicabilityReason }}
              </div>

              <!-- Estado y Aplicabilidad -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge :status="doc.status" />
                <span
                  class="px-2 py-0.5 text-[11px] font-medium rounded-full"
                  :class="doc.applicabilityStatus === 'APLICABLE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : doc.applicabilityStatus === 'NO_APLICA'
                    ? 'bg-zinc-200 text-zinc-700 line-through'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'"
                >
                  {{ doc.applicabilityStatus }}
                </span>
              </div>
            </div>

            <!-- Acciones por Posición -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  title="Modificar aplicabilidad de la posición"
                  @click="openApplicabilityModal(doc)"
                >
                  ⚙️ Aplicabilidad
                </button>
                <button
                  v-if="doc.rules"
                  type="button"
                  class="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  title="Verificar requisitos previos o dependencias"
                  @click="handleCheckDependencies(doc)"
                >
                  🔗 Reglas
                </button>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  v-if="doc.currentInstanceId"
                  type="button"
                  class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition cursor-pointer flex items-center gap-1"
                  title="Visualizar snapshot PDF oficial generado"
                  @click="handleViewDocumentPdf(doc)"
                >
                  <span>📄</span>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  :class="doc.applicabilityStatus === 'NO_APLICA'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : doc.currentInstanceId
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'"
                  :disabled="doc.applicabilityStatus === 'NO_APLICA'"
                  @click="handleOpenOrInitiateDocument(doc)"
                >
                  {{ doc.currentInstanceId ? "Continuar" : "Diligenciar" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN INDEPENDIENTE: DOCUMENTOS FUENTE Y SOPORTES (SOURCE DOCUMENTS) -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-slate-800">
                Documentos Fuente y Soportes Clínicos (Source Documents)
              </h2>
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded">
                Evidencias Primarias
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Historias clínicas hospitalarias, resultados paraclínicos, cálculos de hemodilución y tamizajes. No se contabilizan como posiciones normativas del paquete oficial.
            </p>
          </div>
        </div>

        <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
          <span class="font-bold">Principio de Separación Documental:</span> Los documentos fuente cargados constituyen evidencias de origen médico u hospitalario para alimentar datos clínicos mediante OCR/IA o verificación humana. Conservan trazabilidad append-only y no reemplazan los 23 anexos normativos de la Regional 3.
        </div>

        <!-- Tarjetas de Soportes Clínicos Comunes -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>SOPORTE-HC-01</span>
              <span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium">Vinculado</span>
            </div>
            <div class="font-semibold text-xs text-slate-800">Historia Clínica Donante (IPS Generadora)</div>
            <div class="text-[11px] text-slate-500">Expediente hospitalario de origen</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>SOPORTE-TB-02</span>
              <span class="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-sans font-medium">Opcional</span>
            </div>
            <div class="font-semibold text-xs text-slate-800">Historia Clínica Tissue Bank</div>
            <div class="text-[11px] text-slate-500">Valoración externa de banco de tejidos</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>SOPORTE-HD-03</span>
              <span class="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-sans font-medium">Condicional</span>
            </div>
            <div class="font-semibold text-xs text-slate-800">Cálculo de Hemodilución</div>
            <div class="text-[11px] text-slate-500">Ficha de soporte para validación serológica</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>SOPORTE-CV-04</span>
              <span class="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-sans font-medium">Condicional</span>
            </div>
            <div class="font-semibold text-xs text-slate-800">Tamizaje de Riesgo COVID-19</div>
            <div class="text-[11px] text-slate-500">Evaluación epidémica institucional</div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN FASE C: DICCIONARIO CANÓNICO Y PROPAGACIÓN AUTOMÁTICA -->
      <div v-if="activeMainTab === 'CANONICAL'" class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-800">
                Diccionario Canónico y Propagación — Fase C
              </h2>
              <span class="px-2.5 py-0.5 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full border border-teal-200">
                16 Marcadores Homologados
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Sincronización de fuente única de verdad según alcance (DONOR en DonorRecord, PROCESS en ProcessCanonicalValue). Soporta cardinalidad repetible para mediciones clínicas seriadas (pH, creatinina, signos vitales) y auditoría completa.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              @click="loadCanonical"
            >
              <span>🔄 Recargar Valores</span>
            </button>
          </div>
        </div>

        <!-- Métricas Rápidas de Fase C -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[11px] font-bold text-slate-500 uppercase">Catálogo Homologado</div>
            <div class="text-2xl font-bold font-mono text-slate-800 mt-1">16</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Marcadores normativos</div>
          </div>
          <div class="p-4 bg-teal-50/70 rounded-xl border border-teal-200">
            <div class="text-[11px] font-bold text-teal-700 uppercase">Valores en Proceso</div>
            <div class="text-2xl font-bold font-mono text-teal-900 mt-1">{{ canonicalValues.length }}</div>
            <div class="text-[11px] text-teal-600 mt-0.5">Sincronizados en proceso</div>
          </div>
          <div class="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200">
            <div class="text-[11px] font-bold text-indigo-700 uppercase">Mediciones Seriadas</div>
            <div class="text-2xl font-bold font-mono text-indigo-900 mt-1">
              {{ canonicalValues.filter(v => v.cardinality === 'REPEATABLE').length }}
            </div>
            <div class="text-[11px] text-indigo-600 mt-0.5">pH, creatinina, signos</div>
          </div>
          <div
            class="p-4 rounded-xl border"
            :class="conflictsCount > 0 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'"
          >
            <div class="text-[11px] font-bold uppercase">Conflictos Activos</div>
            <div class="text-2xl font-bold font-mono mt-1" :class="conflictsCount > 0 ? 'text-rose-700' : 'text-emerald-900'">
              {{ conflictsCount }}
            </div>
            <div class="text-[11px] mt-0.5">
              {{ conflictsCount > 0 ? 'Divergencias por resolver' : 'Sin divergencias' }}
            </div>
          </div>
        </div>

        <!-- Alerta de Conflictos Detectados si existen -->
        <div
          v-if="conflictsCount > 0"
          class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start justify-between gap-4"
        >
          <div class="flex items-start gap-2.5">
            <span class="text-lg">⚠️</span>
            <div>
              <strong class="font-bold">Se han detectado divergencias documentales:</strong>
              <p class="mt-0.5 text-rose-800">
                Uno o más anexos poseen valores locales divergentes frente al valor canónico vigente. Resuelva el conflicto seleccionando la decisión consensuada y aportando la justificación clínica obligatoria.
              </p>
            </div>
          </div>
        </div>

        <!-- Tabla de Valores Canónicos Vigentes -->
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th class="px-4 py-3">Marcador Canónico</th>
                <th class="px-4 py-3">Dominio</th>
                <th class="px-4 py-3">Alcance / Política</th>
                <th class="px-4 py-3">Cardinalidad</th>
                <th class="px-4 py-3">Valor Vigente</th>
                <th class="px-4 py-3">Procedencia</th>
                <th class="px-4 py-3">Estado Conflicto</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="loadingCanonical" class="text-center">
                <td colspan="8" class="p-6 text-slate-400">Cargando marcadores canónicos...</td>
              </tr>
              <tr v-else-if="!canonicalValues.length" class="text-center">
                <td colspan="8" class="p-6 text-slate-400">
                  No se han registrado marcadores canónicos en este proceso aún. Se sincronizarán automáticamente al diligenciar anexos como Anexo 1 o Anexo 4.
                </td>
              </tr>
              <tr
                v-for="val in canonicalValues"
                :key="val.id"
                class="hover:bg-slate-50/80 transition"
              >
                <td class="px-4 py-3 font-mono font-medium text-slate-800">
                  <div>{{ val.fieldDefinition?.displayName || val.canonicalFieldKey }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ val.canonicalFieldKey }}</div>
                </td>
                <td class="px-4 py-3 text-slate-600">
                  {{ val.fieldDefinition?.clinicalDomain || "General" }}
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mr-1">
                    {{ val.scope }}
                  </span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                    {{ val.sharingPolicy }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    :class="val.cardinality === 'REPEATABLE' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'"
                  >
                    {{ val.cardinality === 'REPEATABLE' ? 'Seriado (Temporal)' : 'Único' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-slate-900">
                  <span>{{ formatCanonicalValue(val.currentValue, val.dataType) }}</span>
                  <span v-if="val.unit" class="text-slate-400 text-[10px] ml-1">{{ val.unit }}</span>
                  <div v-if="val.sampleContext" class="text-[10px] text-slate-500 italic">
                    {{ val.sampleContext }}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                    📍 {{ val.sourceKind }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="val.conflictStatus === 'CONFLICT_DETECTED'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                  >
                    ⚠️ Divergencia
                  </span>
                  <span
                    v-else-if="val.conflictStatus === 'RESOLVED'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200"
                  >
                    ✓ Resuelto
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700"
                  >
                    Sincronizado
                  </span>
                </td>
                <td class="px-4 py-3 text-right space-x-1.5">
                  <button
                    v-if="val.cardinality === 'REPEATABLE'"
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                    @click="handleViewHistory(val)"
                  >
                    Historial
                  </button>
                  <button
                    v-if="val.conflictStatus === 'CONFLICT_DETECTED'"
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer shadow-xs"
                    @click="handleOpenProcessConflictModal(val)"
                  >
                    Resolver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Grid: Instituciones y Participantes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Instituciones Participantes -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-800">Instituciones Participantes</h2>
              <p class="text-xs text-slate-500">Roles y funciones en este operativo</p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              @click="showInstModal = true"
            >
              + Agregar Institución
            </button>
          </div>

          <div v-if="!currentProcess?.institutions?.length" class="p-6 text-center text-slate-400 text-xs">
            Solo la IPS principal está registrada. Puede agregar bancos de tejidos, IPS extractoras o receptoras.
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="inst in currentProcess.institutions"
              :key="inst.id"
              class="py-3 flex items-center justify-between text-sm"
            >
              <div>
                <div class="font-medium text-slate-800">{{ inst.institutionName }}</div>
                <div class="text-xs text-slate-400">{{ inst.notes || "Sin observaciones adicionales" }}</div>
              </div>
              <span class="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md">
                {{ inst.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Participantes del Operativo -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-800">Participantes del Operativo</h2>
              <p class="text-xs text-slate-500">Cirujanos, coordinadores, deudos y testigos</p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              @click="showPartModal = true"
            >
              + Registrar Participante
            </button>
          </div>

          <div v-if="!currentProcess?.participants?.length" class="p-6 text-center text-slate-400 text-xs">
            No hay participantes adicionales asignados aún.
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="part in currentProcess.participants"
              :key="part.id"
              class="py-3 flex items-center justify-between text-sm"
            >
              <div>
                <div class="font-medium text-slate-800">{{ part.fullName }}</div>
                <div class="text-xs text-slate-400">
                  {{ part.institution || "Institución no indicada" }}
                  <span v-if="part.professionalId">· MP: {{ part.professionalId }}</span>
                </div>
              </div>
              <span class="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md">
                {{ part.role }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN FASE E: EXPEDIENTE DOCUMENTAL CONSOLIDADO Y EXPORTACIÓN -->
      <div v-if="activeMainTab === 'DOSSIER'" class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div class="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-800">
                Expediente Documental Consolidado — Regional 3 (Fase E)
              </h2>
              <span class="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                Paquete Criptográfico Completo
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Consolidación inmutable de documentos liberados, índice oficial paginado, manifiesto de integridad SHA-256 y cadena de custodia unificada.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              :disabled="loadingDossier"
              @click="loadDossierExports"
            >
              <span>🔄 Recargar</span>
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-2"
              @click="handleOpenRequestExportModal"
            >
              <span>📦 Solicitar Exportación de Expediente</span>
            </button>
          </div>
        </div>

        <!-- Banner de Trabajo Activo en Segundo Plano (Redis/BullMQ) -->
        <div
          v-if="activeExport && (activeExport.status === 'PROCESSING' || activeExport.status === 'PENDING')"
          class="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
              <span class="text-sm font-bold text-amber-900">
                Procesando Exportación en Segundo Plano (ID: {{ activeExport.id.slice(0, 8) }}...)
              </span>
            </div>
            <span class="text-xs font-mono font-bold text-amber-800">
              {{ activeExport.progressPercent }}%
            </span>
          </div>
          <div class="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
            <div
              class="bg-amber-600 h-2.5 rounded-full transition-all duration-500"
              :style="{ width: `${activeExport.progressPercent}%` }"
            ></div>
          </div>
          <p class="text-xs text-amber-800">
            <strong>Paso actual:</strong> {{ activeExport.currentStep || "Iniciando consolidación..." }}.
            El sistema continuará procesando automáticamente.
          </p>
        </div>

        <!-- Métricas Rápidas del Expediente -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[11px] font-bold text-slate-500 uppercase">Total Posiciones</div>
            <div class="text-2xl font-bold font-mono text-slate-800 mt-1">23</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Paquete Oficial R3</div>
          </div>
          <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div class="text-[11px] font-bold text-emerald-700 uppercase">Liberados (PDFs)</div>
            <div class="text-2xl font-bold font-mono text-emerald-800 mt-1">{{ packageMetrics.signed }}</div>
            <div class="text-[10px] text-emerald-600 mt-0.5">En expediente consolidado</div>
          </div>
          <div class="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div class="text-[11px] font-bold text-amber-700 uppercase">En Trámite</div>
            <div class="text-2xl font-bold font-mono text-amber-800 mt-1">
              {{ packageMetrics.pending + packageMetrics.inProgress }}
            </div>
            <div class="text-[10px] text-amber-600 mt-0.5">Pendientes de liberación</div>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[11px] font-bold text-slate-500 uppercase">No Aplica</div>
            <div class="text-2xl font-bold font-mono text-slate-700 mt-1">{{ packageMetrics.nonApplicable }}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Justificados con motivo</div>
          </div>
          <div class="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div class="text-[11px] font-bold text-purple-700 uppercase">Homologación</div>
            <div class="text-2xl font-bold font-mono text-purple-800 mt-1">{{ packageMetrics.pendingHomologation }}</div>
            <div class="text-[10px] text-purple-600 mt-0.5">Posiciones 20 a 23</div>
          </div>
        </div>

        <!-- Historial de Paquetes y Exportaciones -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Historial de Expedientes Exportados
            </h3>
            <span class="text-xs text-slate-400">
              {{ dossierExports.length }} registro(s) disponible(s)
            </span>
          </div>

          <div v-if="loadingDossier" class="p-8 text-center text-slate-400 text-xs">
            Cargando expedientes...
          </div>

          <div
            v-else-if="dossierExports.length === 0"
            class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs space-y-2"
          >
            <p>No se han generado exportaciones de expediente para este proceso de donación aún.</p>
            <p class="text-slate-400">
              Haga clic en <strong>"Solicitar Exportación de Expediente"</strong> para compilar el paquete ZIP con los documentos liberados.
            </p>
          </div>

          <div v-else class="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3">Fecha / Operador</th>
                  <th class="px-4 py-3">Tipo / Estado</th>
                  <th class="px-4 py-3">Tamaño ZIP</th>
                  <th class="px-4 py-3">Hash SHA-256 (Paquete)</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="exp in dossierExports" :key="exp.id" class="hover:bg-slate-50/60 transition">
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800">{{ formatDate(exp.createdAt) }}</div>
                    <div class="text-[11px] text-slate-400">
                      {{ exp.requestedBy?.fullName || "Coordinador GODT" }}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        :class="{
                          'bg-emerald-100 text-emerald-800': exp.status === 'COMPLETED',
                          'bg-amber-100 text-amber-800 animate-pulse': exp.status === 'PROCESSING' || exp.status === 'PENDING',
                          'bg-rose-100 text-rose-800': exp.status === 'FAILED',
                          'bg-slate-100 text-slate-600': exp.status === 'EXPIRED',
                        }"
                      >
                        {{ exp.status }}
                      </span>
                      <span class="text-[11px] text-slate-500 font-mono">
                        {{ exp.exportType }}
                      </span>
                    </div>
                    <div v-if="exp.includeSourceDocuments" class="text-[10px] text-amber-700 font-semibold mt-0.5">
                      + Fuentes complementarias incluidas
                    </div>
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-600">
                    {{ formatBytes(exp.zipSizeBytes) }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      v-if="exp.zipSha256"
                      class="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate max-w-[200px]"
                      :title="exp.zipSha256"
                    >
                      {{ exp.zipSha256 }}
                    </span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                  <td class="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <!-- Descargar ZIP -->
                    <button
                      v-if="exp.status === 'COMPLETED' && exp.zipStorageKey"
                      type="button"
                      class="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-semibold transition cursor-pointer"
                      title="Descargar paquete ZIP completo"
                      @click="handleDownloadZip(exp)"
                    >
                      ⬇️ ZIP
                    </button>

                    <!-- Descargar PDF Consolidado -->
                    <button
                      v-if="exp.status === 'COMPLETED' && exp.consolidatedPdfStorageKey"
                      type="button"
                      class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition cursor-pointer"
                      title="Descargar documento PDF consolidado"
                      @click="handleDownloadConsolidatedPdf(exp)"
                    >
                      📄 PDF
                    </button>

                    <!-- Ver Manifiesto -->
                    <button
                      v-if="exp.status === 'COMPLETED'"
                      type="button"
                      class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
                      title="Ver Manifiesto de Integridad"
                      @click="handleViewManifest(exp)"
                    >
                      📜 Manifiesto
                    </button>

                    <!-- Verificar Integridad -->
                    <button
                      v-if="exp.status === 'COMPLETED'"
                      type="button"
                      class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold transition cursor-pointer"
                      title="Ejecutar Verificación Criptográfica SHA-256"
                      @click="handleVerifyIntegrity(exp)"
                    >
                      🛡️ Verificar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Matriz de las 23 Posiciones en el Expediente -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Matriz de Composición del Expediente (23 Posiciones)
            </h3>
            <span class="text-xs text-slate-500">
              Taxonomía Reglamentaria Regional 3
            </span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-2.5 w-16"># Pos</th>
                  <th class="px-4 py-2.5">Código</th>
                  <th class="px-4 py-2.5">Documento / Anexo</th>
                  <th class="px-4 py-2.5">Categoría</th>
                  <th class="px-4 py-2.5">Estado Operativo</th>
                  <th class="px-4 py-2.5">Inclusión en Expediente</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="doc in documentsSummary?.documents || []"
                  :key="doc.id"
                  class="hover:bg-slate-50/50 transition"
                >
                  <td class="px-4 py-2.5 font-mono font-bold text-slate-700">
                    {{ doc.positionNumber }}
                  </td>
                  <td class="px-4 py-2.5 font-mono font-semibold text-indigo-700">
                    {{ doc.documentCode }}
                  </td>
                  <td class="px-4 py-2.5 font-medium text-slate-800">
                    {{ doc.title }}
                  </td>
                  <td class="px-4 py-2.5">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-semibold"
                      :class="doc.category === 'PENDING_HOMOLOGATION' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ doc.category }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5">
                    <StatusBadge :status="doc.status" />
                  </td>
                  <td class="px-4 py-2.5">
                    <span
                      v-if="((doc.status as string) === 'LIBERADO' || (doc.status as string) === 'FIRMADO') && doc.applicabilityStatus !== 'NO_APLICA'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold"
                    >
                      ✓ Incluido en PDF y ZIP
                    </span>
                    <span
                      v-else-if="doc.applicabilityStatus === 'NO_APLICA'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[11px]"
                    >
                      ⊗ Descartado (No Aplica)
                    </span>
                    <span
                      v-else-if="doc.category === 'PENDING_HOMOLOGATION'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px]"
                    >
                      ⏳ Pendiente Homologación
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px]"
                    >
                      ⏳ En trámite (sin PDF liberado)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Modificar Aplicabilidad -->
      <div
        v-if="showApplicabilityModal && selectedDocForApplicability"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-800">Modificar Aplicabilidad</h3>
              <p class="text-xs text-slate-500 font-mono">Posición {{ selectedDocForApplicability.positionNumber }} — {{ selectedDocForApplicability.documentCode }}</p>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="showApplicabilityModal = false">✕</button>
          </div>
          <form class="p-6 space-y-4" @submit.prevent="handleSaveApplicability">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Criterio de Aplicabilidad *</label>
              <select
                v-model="applicabilityForm.applicabilityStatus"
                required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="APLICABLE">APLICABLE</option>
                <option value="NO_APLICA">NO_APLICA (Descartar)</option>
                <option value="CONDICIONAL">CONDICIONAL</option>
                <option value="PENDIENTE_CRITERIO">PENDIENTE_CRITERIO</option>
              </select>
            </div>

            <div v-if="applicabilityForm.applicabilityStatus === 'NO_APLICA'">
              <label class="block text-xs font-semibold text-rose-700 uppercase mb-1">
                Justificación Clínica o Legal (Obligatoria) *
              </label>
              <textarea
                v-model="applicabilityForm.nonApplicabilityReason"
                required
                rows="3"
                placeholder="Indique la razón por la cual esta posición no aplica a este donante/proceso..."
                class="w-full px-3 py-2 bg-slate-50 border border-rose-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              ></textarea>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-4 py-2 text-sm text-slate-600" @click="showApplicabilityModal = false">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Ver Dependencias -->
      <div
        v-if="showDependenciesModal && dependencyResult"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-800">Evaluación de Dependencias</h3>
              <p class="text-xs text-slate-500 font-mono">{{ dependencyResult.documentCode }}</p>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="showDependenciesModal = false">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div
              class="p-3 rounded-lg text-xs font-medium flex items-center gap-2"
              :class="dependencyResult.isSatisfied ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
            >
              <span class="text-base">{{ dependencyResult.isSatisfied ? "✅" : "⚠️" }}</span>
              <span>{{ dependencyResult.isSatisfied ? "Todas las dependencias normativas están satisfechas." : "Existen requisitos previos pendientes para esta posición." }}</span>
            </div>

            <div v-if="dependencyResult.blockingReasons.length" class="space-y-2">
              <div class="text-xs font-bold text-slate-700 uppercase">Motivos Bloqueantes (Para Cierre / Firma):</div>
              <ul class="list-disc list-inside text-xs text-rose-700 space-y-1">
                <li v-for="(reason, idx) in dependencyResult.blockingReasons" :key="idx">
                  {{ reason }}
                </li>
              </ul>
            </div>

            <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong class="text-slate-800">Regla de Diligenciamiento:</strong> Estas dependencias regulan la suscripción y cierre definitivo. No impiden iniciar, editar ni guardar borradores de trabajo durante la atención del proceso.
            </div>

            <div class="pt-4 flex justify-end border-t border-slate-100">
              <button
                type="button"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium"
                @click="showDependenciesModal = false"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Notificación Homologación -->
      <div
        v-if="showHomologationNoticeModal && noticeDoc"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚠️</span>
              <h3 class="text-base font-bold text-amber-900">Posición No Homologada</h3>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="showHomologationNoticeModal = false">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-xs text-slate-700 leading-relaxed">
              La posición <strong class="text-slate-900">{{ noticeDoc.title }}</strong> (<code class="text-indigo-600 font-mono">{{ noticeDoc.documentCode }}</code>) está formalmente reservada en el catálogo normativo de 23 posiciones, pero <strong>aún no cuenta con una plantilla oficial aprobada ni publicada</strong> por la Coordinación Regional de Trasplantes.
            </p>
            <p class="text-xs text-slate-500 leading-relaxed">
              No puede generarse una instancia interactiva de diligenciamiento hasta que la plantilla correspondiente sea configurada y publicada en el catálogo de plantillas institucionales.
            </p>
            <div class="pt-4 flex justify-end border-t border-slate-100">
              <button
                type="button"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium"
                @click="showHomologationNoticeModal = false"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Agregar Institución -->
      <div
        v-if="showInstModal"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">Asociar Institución Participante</h3>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="showInstModal = false">✕</button>
          </div>
          <form class="p-6 space-y-4" @submit.prevent="handleAddInstitution">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre de la Institución *</label>
              <input
                v-model="instForm.institutionName"
                type="text"
                required
                placeholder="Ej. Banco de Tejidos Regional 3"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Rol Operativo *</label>
              <select
                v-model="instForm.role"
                required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IPS_EXTRACTORA">IPS Extractora</option>
                <option value="BANCO_TEJIDOS">Banco de Tejidos</option>
                <option value="IPS_TRASPLANTADORA">IPS Trasplantadora</option>
                <option value="INMLCF">INMLCF</option>
                <option value="COORDINACION_REGIONAL">Coordinación Regional</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Notas</label>
              <input
                v-model="instForm.notes"
                type="text"
                placeholder="Detalle de asignación..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-4 py-2 text-sm text-slate-600" @click="showInstModal = false">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Asociar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Agregar Participante -->
      <div
        v-if="showPartModal"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">Registrar Participante</h3>
            <button type="button" class="text-slate-400 hover:text-slate-600" @click="showPartModal = false">✕</button>
          </div>
          <form class="p-6 space-y-4" @submit.prevent="handleAddParticipant">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  v-model="partForm.fullName"
                  type="text"
                  required
                  placeholder="Dra. Carmen Mendoza"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Rol Operativo *</label>
                <select
                  v-model="partForm.role"
                  required
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CIRUJANO_RESCATE">Cirujano de Rescate</option>
                  <option value="COORDINADOR_OPERATIVO">Coordinador Operativo</option>
                  <option value="MEDICO_CERTIFICADOR">Médico Certificador</option>
                  <option value="MEDICO_TRATANTE">Médico Tratante</option>
                  <option value="TECNICO_TEJIDOS">Técnico de Tejidos</option>
                  <option value="DEUDO_NOTIFICADO">Deudo Notificado</option>
                  <option value="REPRESENTANTE_LEGAL">Representante Legal</option>
                  <option value="TESTIGO">Testigo</option>
                  <option value="CUSTODIO">Custodio</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo Doc.</label>
                <select
                  v-model="partForm.documentType"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Número Doc.</label>
                <input
                  v-model="partForm.documentNumber"
                  type="text"
                  placeholder="12345678"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Registro Prof.</label>
                <input
                  v-model="partForm.professionalId"
                  type="text"
                  placeholder="MP-12345"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Institución</label>
                <input
                  v-model="partForm.institution"
                  type="text"
                  placeholder="Clínica Imbanaco"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono</label>
                <input
                  v-model="partForm.phone"
                  type="text"
                  placeholder="3101234567"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-4 py-2 text-sm text-slate-600" @click="showPartModal = false">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Registrar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Historial de Mediciones Seriadas (Fase C) -->
      <div
        v-if="showHistoryModal"
        class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📊 Historial de Mediciones:</span>
                <span class="text-indigo-600">{{ historyTitle }}</span>
              </h3>
              <p class="text-xs text-slate-500">
                Serie temporal de registros clínicos ordenados cronológicamente (apéndice inmutable).
              </p>
            </div>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 p-1"
              @click="showHistoryModal = false"
            >
              ✕
            </button>
          </div>

          <div v-if="loadingHistory" class="p-8 text-center text-xs text-slate-400">
            Cargando historial de mediciones...
          </div>
          <div v-else-if="!historyEntries.length" class="p-8 text-center text-xs text-slate-400">
            No se han registrado mediciones históricas para este marcador aún.
          </div>
          <div v-else class="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th class="px-3 py-2.5">#</th>
                  <th class="px-3 py-2.5">Fecha / Hora Efectiva</th>
                  <th class="px-3 py-2.5">Valor Registrado</th>
                  <th class="px-3 py-2.5">Contexto / Muestra</th>
                  <th class="px-3 py-2.5">Procedencia</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="entry in historyEntries" :key="entry.id" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-mono text-slate-400">v{{ entry.versionNumber }}</td>
                  <td class="px-3 py-2 font-medium text-slate-800">{{ formatDate(entry.effectiveAt) }}</td>
                  <td class="px-3 py-2 font-bold text-indigo-700">
                    {{ String(entry.value) }} {{ entry.unit || "" }}
                  </td>
                  <td class="px-3 py-2 text-slate-600">{{ entry.sampleContext || "Sin especificar" }}</td>
                  <td class="px-3 py-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                      {{ entry.sourceKind }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              @click="showHistoryModal = false"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Resolución de Conflicto en Proceso (Fase C) -->
      <div
        v-if="showProcessConflictModal && resolvingField"
        class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
          <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Resolución de Divergencia Canónica
              </h3>
              <p class="text-xs text-slate-500 font-mono">
                {{ resolvingField.canonicalFieldKey }}
              </p>
            </div>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
            <p><strong>Valor Canónico Registrado:</strong> {{ String(resolvingField.currentValue) }}</p>
            <p><strong>Procedencia:</strong> {{ resolvingField.sourceKind }}</p>
            <p v-if="resolvingField.conflictDetails" class="text-slate-500 font-mono text-[10px]">
              Detalle: {{ JSON.stringify(resolvingField.conflictDetails) }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700">Estrategia de Resolución:</label>
            <div class="space-y-1.5 text-xs text-slate-800">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="processConflictForm.strategy"
                  type="radio"
                  value="ACCEPT_CANDIDATE"
                  class="text-indigo-600"
                />
                <span>Sobrescribir divergencias con el valor canónico (ACCEPT_CANDIDATE)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="processConflictForm.strategy"
                  type="radio"
                  value="KEEP_CURRENT"
                  class="text-indigo-600"
                />
                <span>Mantener divergencias locales en documentos (KEEP_CURRENT)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="processConflictForm.strategy"
                  type="radio"
                  value="MANUAL_OVERRIDE"
                  class="text-indigo-600"
                />
                <span>Definir un nuevo valor consensuado (MANUAL_OVERRIDE)</span>
              </label>
            </div>
          </div>

          <div v-if="processConflictForm.strategy === 'MANUAL_OVERRIDE'" class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700">Nuevo Valor Manual:</label>
            <input
              v-model="processConflictForm.manualValue"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="Ingrese el valor consensuado"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700">
              Justificación Clínica / Administrativa (Obligatoria):
            </label>
            <textarea
              v-model="processConflictForm.justification"
              rows="3"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              placeholder="Describa el motivo clínico, verificación de historia clínica o soporte documental de esta resolución..."
            />
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              class="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              :disabled="resolvingProcessConflict"
              @click="showProcessConflictModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
              :disabled="resolvingProcessConflict"
              @click="handleConfirmProcessConflict"
            >
              {{ resolvingProcessConflict ? "Resolviendo…" : "Aplicar Resolución" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Visualización PDF Oficial (Fase D) -->
    <PdfViewerModal
      v-if="showProcessPdfModal && selectedProcessPdfSnapshot"
      :instance-id="selectedProcessInstanceId"
      :snapshot="selectedProcessPdfSnapshot"
      :document-title="selectedProcessPdfDocTitle"
      @close="showProcessPdfModal = false"
    />

    <!-- MODAL 1: Solicitar Exportación de Expediente (Fase E) -->
    <div
      v-if="showRequestExportModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-800">
              Solicitar Exportación de Expediente
            </h3>
            <p class="text-xs text-slate-500">
              Proceso {{ currentProcess?.processCode }} — Donante {{ currentProcess?.donor?.fullName }}
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 cursor-pointer"
            @click="showRequestExportModal = false"
          >
            ✕
          </button>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="handleConfirmRequestExport">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Tipo de Paquete a Generar *
            </label>
            <select
              v-model="requestExportForm.exportType"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="FULL_ZIP">
                Expediente Completo (Archivo ZIP con las 6 carpetas reglamentarias)
              </option>
              <option value="CONSOLIDATED_PDF">
                Solo Documento PDF Consolidado Continuo
              </option>
            </select>
          </div>

          <!-- Opción de Documentos Fuente / Historias Clínicas -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div class="flex items-start gap-3">
              <input
                id="incSources"
                v-model="requestExportForm.includeSourceDocuments"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label for="incSources" class="text-xs text-slate-700 cursor-pointer">
                <span class="font-bold text-slate-800 block">
                  Incluir Documentos Fuente e Historias Clínicas Complementarias
                </span>
                Carpeta <code>05_FUENTES_COMPLEMENTARIAS</code>. Por defecto los documentos fuente sensibles se excluyen de la exportación general.
              </label>
            </div>

            <!-- Advertencia de Seguridad y Confirmación Obligatoria -->
            <div
              v-if="requestExportForm.includeSourceDocuments"
              class="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-2 text-amber-900"
            >
              <div class="font-bold flex items-center gap-1.5">
                <span>⚠️ ADVERTENCIA DE PRIVACIDAD Y SEGURIDAD CLÍNICA:</span>
              </div>
              <p>
                De acuerdo con la Ley Estatutaria 1581 de 2012 y normatividad sanitaria de trasplantes, la historia clínica y anexos fuente son confidenciales. Solo deben exportarse para fines de auditoría forense o requerimiento judicial expreso.
              </p>
              <div class="flex items-center gap-2 pt-1 border-t border-amber-200">
                <input
                  id="confirmSensitive"
                  v-model="requestExportForm.confirmSensitiveNotice"
                  type="checkbox"
                  class="h-4 w-4 rounded border-amber-400 text-teal-600 focus:ring-teal-500"
                />
                <label for="confirmSensitive" class="text-[11px] font-semibold cursor-pointer">
                  Confirmo bajo juramento que cuento con la debida autorización institucional.
                </label>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              :disabled="requestingExport"
              @click="showRequestExportModal = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              :disabled="requestingExport"
            >
              <span v-if="requestingExport" class="inline-block animate-spin">⏳</span>
              <span>{{ requestingExport ? "Encolando exportación…" : "Generar Expediente" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: Ver Manifiesto de Integridad (Fase E) -->
    <div
      v-if="showManifestModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-800">
              Manifiesto de Integridad Criptográfica (SHA-256)
            </h3>
            <p class="text-xs text-slate-500 font-mono">
              manifiesto_integridad.json — {{ currentManifest?.processCode }}
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 cursor-pointer"
            @click="showManifestModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4 flex-1">
          <div v-if="loadingManifest" class="p-8 text-center text-slate-400 text-xs">
            Cargando manifiesto...
          </div>
          <div v-else-if="currentManifest" class="space-y-4">
            <!-- Tarjetas de resumen del manifiesto -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Generado por</div>
                <div class="font-bold text-slate-800 truncate">{{ currentManifest.generatedBy?.fullName }}</div>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Fecha</div>
                <div class="font-bold text-slate-800">{{ formatDate(currentManifest.generatedAt) }}</div>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Documentos Liberados</div>
                <div class="font-bold font-mono text-emerald-700">{{ currentManifest.summary?.releasedCount }} / 23</div>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Hash Determinista</div>
                <div class="font-mono text-[10px] text-slate-700 truncate" :title="currentManifest.manifestSha256">
                  {{ currentManifest.manifestSha256 || "N/A" }}
                </div>
              </div>
            </div>

            <!-- Preformatted JSON Viewer -->
            <div class="relative">
              <pre class="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[50vh] leading-relaxed select-all">{{ JSON.stringify(currentManifest, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            @click="showManifestModal = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: Auditoría y Verificación Criptográfica SHA-256 (Fase E) -->
    <div
      v-if="showVerificationModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🛡️</span>
            <div>
              <h3 class="text-base font-bold text-slate-800">
                Auditoría Criptográfica de Integridad Documental
              </h3>
              <p class="text-xs text-slate-500">
                Verificación matemática bit a bit de sumas de chequeo SHA-256 contra el manifiesto inmutable
              </p>
            </div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 cursor-pointer"
            @click="showVerificationModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-5 flex-1">
          <div v-if="verifyingIntegrity" class="p-12 text-center space-y-3">
            <span class="inline-block animate-spin text-3xl">🔄</span>
            <p class="text-sm font-semibold text-slate-700">
              Calculando sumas criptográficas SHA-256 de todos los componentes...
            </p>
            <p class="text-xs text-slate-400">
              Esto garantiza que ningún PDF, manifiesto ni archivo ZIP haya sido modificado tras su liberación.
            </p>
          </div>

          <div v-else-if="verificationReport" class="space-y-5">
            <!-- Banner de Estatus Global -->
            <div
              class="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              :class="{
                'bg-emerald-50 border-emerald-300 text-emerald-950': verificationReport.overallStatus === 'INTEGRITY_VERIFIED',
                'bg-rose-50 border-rose-300 text-rose-950': verificationReport.overallStatus === 'INTEGRITY_COMPROMISED',
                'bg-amber-50 border-amber-300 text-amber-950': verificationReport.overallStatus === 'VERIFICATION_FAILED',
              }"
            >
              <div class="flex items-center gap-3.5">
                <span class="text-3xl">
                  {{
                    verificationReport.overallStatus === 'INTEGRITY_VERIFIED'
                      ? '✅'
                      : verificationReport.overallStatus === 'VERIFICATION_FAILED'
                      ? '⚠️'
                      : '❌'
                  }}
                </span>
                <div>
                  <h4 class="text-base font-bold">
                    {{
                      verificationReport.overallStatus === 'INTEGRITY_VERIFIED'
                        ? 'INTEGRIDAD FORENSE COMPLETA (100% VERIFICADA)'
                        : verificationReport.overallStatus === 'VERIFICATION_FAILED'
                        ? 'FALLO EN VERIFICACIÓN DE ALMACENAMIENTO'
                        : 'ALERTA CRÍTICA: INTEGRIDAD COMPROMETIDA'
                    }}
                  </h4>
                  <p class="text-xs opacity-90 mt-0.5">
                    {{
                      verificationReport.overallStatus === 'INTEGRITY_VERIFIED'
                        ? 'El paquete ZIP, el manifiesto y todos los archivos coinciden byte a byte con los registros criptográficos.'
                        : verificationReport.overallStatus === 'VERIFICATION_FAILED'
                        ? 'No se pudo acceder al archivo en almacenamiento para completar la auditoría.'
                        : 'Se detectaron archivos modificados, alterados, faltantes o discrepancias con PostgreSQL.'
                    }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 text-xs font-mono font-bold">
                <div class="px-3 py-1.5 bg-white/80 rounded-lg border border-current">
                  {{ verificationReport.correctFilesCount ?? verificationReport.passedCount }} / {{ verificationReport.totalFilesInspected ?? verificationReport.totalChecked }} archivos OK
                </div>
              </div>
            </div>

            <!-- Desglose de Tres Niveles Criptográficos -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <!-- Nivel C: Hash Binario del ZIP -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700">Nivel C: Hash Binario ZIP (PostgreSQL)</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    :class="verificationReport.packageHashMatches ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ verificationReport.packageHashMatches ? 'COINCIDE' : 'DIVERGENCIA' }}
                  </span>
                </div>
                <div class="font-mono text-[10px] text-slate-500 truncate" :title="verificationReport.actualPackageSha256">
                  CALC: {{ verificationReport.actualPackageSha256 || 'N/A' }}
                </div>
              </div>

              <!-- Nivel B: Digest Canónico del Manifiesto -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700">Nivel B: Digest Canónico del Manifiesto</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    :class="verificationReport.manifestDigestMatches ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ verificationReport.manifestDigestMatches ? 'VÁLIDO' : 'ALTERADO' }}
                  </span>
                </div>
                <div class="font-mono text-[10px] text-slate-500 truncate" :title="verificationReport.actualManifestDigest">
                  DIGEST: {{ verificationReport.actualManifestDigest || 'N/A' }}
                </div>
              </div>
            </div>

            <!-- Tabla de Archivos Inspeccionados (Nivel A) -->
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Ruta Relativa / Archivo</th>
                    <th class="px-4 py-3">Hash SHA-256 (Esperado vs Calculado)</th>
                    <th class="px-4 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-for="item in verificationReport.items" :key="item.relativePath || item.fileName" class="hover:bg-slate-50/60 transition">
                    <td class="px-4 py-3 font-semibold text-slate-600">
                      {{ item.itemType }}
                    </td>
                    <td class="px-4 py-3 font-mono text-slate-800">
                      <div>{{ item.relativePath || item.fileName }}</div>
                      <div v-if="item.details" class="text-[10px] text-slate-400 font-sans mt-0.5">
                        {{ item.details }}
                      </div>
                    </td>
                    <td class="px-4 py-3 font-mono text-[10px] space-y-0.5">
                      <div class="text-slate-500 truncate max-w-[280px]" :title="item.expectedSha256">
                        <span class="text-slate-400">EXP:</span> {{ item.expectedSha256 }}
                      </div>
                      <div :class="item.matches ? 'text-emerald-700' : 'text-rose-700 font-bold'" class="truncate max-w-[280px]" :title="item.actualSha256">
                        <span class="text-slate-400">ACT:</span> {{ item.actualSha256 }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="{
                          'bg-emerald-100 text-emerald-800': item.status === 'OK',
                          'bg-rose-100 text-rose-800': item.status === 'ALTERED',
                          'bg-amber-100 text-amber-800': item.status === 'MISSING',
                          'bg-purple-100 text-purple-800': item.status === 'UNEXPECTED',
                          'bg-slate-100 text-slate-700': item.status === 'ERROR',
                        }"
                      >
                        {{ item.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="p-3 bg-slate-50 rounded-lg text-slate-500 text-[11px]">
              <strong>Auditoría registrada:</strong> Evento <code>DOSSIER_INTEGRITY_VERIFIED</code> por
              {{ verificationReport.verifiedBy }} el {{ formatDate(verificationReport.verifiedAt) }}.
            </div>
          </div>
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            @click="showVerificationModal = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
</template>
