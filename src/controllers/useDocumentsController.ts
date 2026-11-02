import { computed, onMounted, reactive, ref } from "vue";
import { getApiError } from "../services/api";
import {
  ALLOWED_DOCUMENT_TYPES,
  documentsService,
  MAX_DOCUMENT_SIZE,
  type UploadProgress
} from "../services/documents";
import type { SourceDocument } from "../types/documents";

export function useDocumentsController(donorId: string) {
  const documents = ref<SourceDocument[]>([]);
  const selected = ref<SourceDocument | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const error = ref("");
  const uploadError = ref("");
  const progress = ref<UploadProgress | null>(null);
  const category = ref("");
  const file = ref<File | null>(null);
  const filters = reactive({ query: "" });

  const filteredDocuments = computed(() => {
    const query = filters.query.trim().toLowerCase();
    if (!query) return documents.value;
    return documents.value.filter((document) =>
      [document.originalFilename, document.documentCategory, document.mimeType]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      documents.value = await documentsService.list(donorId);
    } catch (reason) {
      error.value = getApiError(reason);
    } finally {
      loading.value = false;
    }
  }

  function validateFile(candidate: File): string {
    if (!ALLOWED_DOCUMENT_TYPES.includes(candidate.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
      return "Formato no compatible. Usa PDF, PNG o JPEG.";
    }
    if (candidate.size > MAX_DOCUMENT_SIZE) {
      return "El archivo supera el límite permitido de 10 MiB.";
    }
    if (!candidate.size) return "El archivo está vacío.";
    return "";
  }

  function selectFile(candidate: File | null) {
    uploadError.value = "";
    file.value = candidate;
    if (candidate) uploadError.value = validateFile(candidate);
  }

  async function upload() {
    uploadError.value = "";
    if (!file.value) {
      uploadError.value = "Selecciona un documento.";
      return;
    }
    const validationError = validateFile(file.value);
    if (validationError) {
      uploadError.value = validationError;
      return;
    }
    if (!category.value.trim()) {
      uploadError.value = "Indica la categoría del documento.";
      return;
    }

    uploading.value = true;
    progress.value = { loaded: 0, total: file.value.size, percentage: 0 };
    try {
      const uploaded = await documentsService.upload(
        donorId,
        { file: file.value, documentCategory: category.value.trim() },
        (value) => { progress.value = value; }
      );
      documents.value = [uploaded, ...documents.value];
      file.value = null;
      category.value = "";
      progress.value = null;
    } catch (reason) {
      uploadError.value = getApiError(reason);
    } finally {
      uploading.value = false;
    }
  }

  async function showDetails(documentId: string) {
    error.value = "";
    try {
      selected.value = await documentsService.get(documentId);
    } catch (reason) {
      error.value = getApiError(reason);
    }
  }

  async function download(document: SourceDocument) {
    error.value = "";
    try {
      await documentsService.download(document.id, document.originalFilename);
    } catch (reason) {
      error.value = getApiError(reason);
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function formatSize(value: number) {
    return `${(value / 1024 / 1024).toFixed(1)} MiB`;
  }

  onMounted(load);

  return {
    documents,
    filteredDocuments,
    selected,
    loading,
    uploading,
    error,
    uploadError,
    progress,
    category,
    file,
    filters,
    selectFile,
    upload,
    showDetails,
    download,
    formatDate,
    formatSize,
    load
  };
}
