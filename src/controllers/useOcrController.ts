import { onBeforeUnmount, onMounted, ref } from "vue";
import { getApiError } from "../services/api";
import { documentsService } from "../services/documents";
import { ocrService } from "../services/ocr";
import type { SourceDocument } from "../types/documents";
import type { OcrDecision, OcrField, OcrJob, OcrJobStatus } from "../types/ocr";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 24;

export function useOcrController(documentId: string) {
  const document = ref<SourceDocument | null>(null);
  const job = ref<OcrJob | null>(null);
  const fields = ref<OcrField[]>([]);
  const loading = ref(false);
  const starting = ref(false);
  const validating = ref<string | null>(null);
  const error = ref("");
  const fieldError = ref("");
  const activeField = ref<OcrField | null>(null);
  const editedValue = ref("");
  let pollingTimer: ReturnType<typeof setTimeout> | null = null;
  let pollingInFlight = false;
  let pollAttempts = 0;

  const statusLabel: Record<OcrJobStatus, string> = {
    EN_COLA: "Procesamiento en cola",
    COMPLETADO: "Procesamiento completado",
    FALLIDO: "Procesamiento fallido"
  };

  async function loadDocument() {
    document.value = await documentsService.get(documentId);
  }

  async function loadFields(jobId: string) {
    if (pollingInFlight) return;
    pollingInFlight = true;
    try {
      const response = await ocrService.getJob(jobId);
      fields.value = response.fields;
      if (job.value?.status === "EN_COLA" && response.fields.length === 0 && pollAttempts < MAX_POLL_ATTEMPTS) {
        pollAttempts += 1;
        schedulePoll(jobId);
      } else if (job.value?.status === "EN_COLA" && response.fields.length === 0) {
        error.value = "El backend no expone el estado actualizado del trabajo; revisa nuevamente cuando el procesamiento haya terminado.";
      }
    } catch (reason) {
      error.value = getApiError(reason);
    } finally {
      pollingInFlight = false;
    }
  }

  function schedulePoll(jobId: string) {
    if (pollingTimer) clearTimeout(pollingTimer);
    pollingTimer = setTimeout(() => void loadFields(jobId), POLL_INTERVAL_MS);
  }

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      await loadDocument();
    } catch (reason) {
      error.value = getApiError(reason);
    } finally {
      loading.value = false;
    }
  }

  async function start() {
    if (starting.value || !document.value) return;
    starting.value = true;
    error.value = "";
    try {
      job.value = await ocrService.start(documentId);
      fields.value = [];
      pollAttempts = 0;
      await loadFields(job.value.id);
    } catch (reason) {
      error.value = getApiError(reason);
    } finally {
      starting.value = false;
    }
  }

  function openValidation(field: OcrField) {
    fieldError.value = "";
    activeField.value = field;
    editedValue.value = field.confirmedValue ?? field.candidateValue;
  }

  function closeValidation() {
    activeField.value = null;
    fieldError.value = "";
  }

  async function validate(status: OcrDecision) {
    if (!activeField.value || validating.value) return;
    if (status === "MODIFICADO" && !editedValue.value.trim()) {
      fieldError.value = "Escribe el valor corregido antes de confirmar la modificación.";
      return;
    }
    validating.value = activeField.value.id;
    fieldError.value = "";
    try {
      const input = status === "MODIFICADO"
        ? { status, confirmedValue: editedValue.value.trim() }
        : { status };
      const updated = await ocrService.validate(activeField.value.id, input);
      fields.value = fields.value.map((field) => field.id === updated.id ? updated : field);
      closeValidation();
    } catch (reason) {
      fieldError.value = getApiError(reason);
    } finally {
      validating.value = null;
    }
  }

  function formatDate(value: string | null) {
    return value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Pendiente";
  }

  onMounted(load);
  onBeforeUnmount(() => {
    if (pollingTimer) clearTimeout(pollingTimer);
  });

  return {
    document, job, fields, loading, starting, validating, error, fieldError,
    activeField, editedValue, statusLabel, start, openValidation, closeValidation,
    validate, formatDate, loadFields
  };
}
