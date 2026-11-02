import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { getApiError } from "../services/api";
import { documentInstancesService } from "../services/documentInstances";
import type { DocumentInstance, DocumentProvenance, DocumentRevision, ResolveConflictInput } from "../types/document-engine";

export function useDocumentReviewController(instanceId: string) {
  const instance = ref<DocumentInstance | null>(null);
  const loading = ref(false);
  const resolving = ref(false);
  const error = ref("");
  const resolveError = ref("");
  const selectedRevisionIds = ref<string[]>([]);
  const activeConflict = ref<DocumentProvenance | null>(null);
  const decision = ref("");
  const justification = ref("");

  const revisions = computed(() => instance.value?.revisions ?? []);
  const selectedRevisions = computed(() =>
    selectedRevisionIds.value
      .map((id) => revisions.value.find((revision) => revision.id === id))
      .filter((revision): revision is DocumentRevision => Boolean(revision))
  );
  const conflicts = computed(() =>
    revisions.value.flatMap((revision) => (revision.provenance ?? [])
      .filter((provenance) => provenance.conflictStatus === "PENDING")
      .map((provenance) => ({ ...provenance, revisionNumber: revision.revisionNumber })))
  );

  async function load() {
    loading.value = true;
    error.value = "";
    try { instance.value = await documentInstancesService.get(instanceId); }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }

  function toggleRevision(id: string) {
    selectedRevisionIds.value = selectedRevisionIds.value.includes(id)
      ? selectedRevisionIds.value.filter((selectedId) => selectedId !== id)
      : selectedRevisionIds.value.length < 2
        ? [...selectedRevisionIds.value, id]
        : [selectedRevisionIds.value[1], id];
  }

  function openConflict(conflict: DocumentProvenance) {
    activeConflict.value = conflict;
    decision.value = "";
    justification.value = "";
    resolveError.value = "";
  }

  function closeConflict() { activeConflict.value = null; resolveError.value = ""; }

  async function resolveConflict() {
    if (!activeConflict.value || !decision.value || !justification.value.trim()) {
      resolveError.value = "Selecciona una decisión y escribe la justificación.";
      return;
    }
    resolving.value = true;
    resolveError.value = "";
    const input: ResolveConflictInput = {
      fieldPath: activeConflict.value.fieldPath,
      decision: decision.value,
      justification: justification.value.trim()
    };
    try {
      await documentInstancesService.resolveConflict(instanceId, input);
      closeConflict();
      await load();
    } catch (reason) { resolveError.value = getApiError(reason); }
    finally { resolving.value = false; }
  }

  function formatDate(value: string | null | undefined) {
    return value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "No disponible";
  }

  onMounted(load);
  onBeforeUnmount(() => { selectedRevisionIds.value = []; });

  return {
    instance, loading, resolving, error, resolveError, revisions, selectedRevisions,
    conflicts, selectedRevisionIds, activeConflict, decision, justification,
    load, toggleRevision, openConflict, closeConflict, resolveConflict, formatDate
  };
}
