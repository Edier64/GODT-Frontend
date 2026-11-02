import { onMounted, ref } from "vue";
import { getApiError } from "../services/api";
import { documentInstancesService } from "../services/documentInstances";
import type { DocumentInstance } from "../types/document-engine";

export function useDocumentFinalizationController(instanceId: string) {
  const instance = ref<DocumentInstance | null>(null);
  const loading = ref(false);
  const validating = ref(false);
  const error = ref("");
  const validationMessage = ref("");

  async function load() {
    loading.value = true;
    error.value = "";
    try { instance.value = await documentInstancesService.get(instanceId); }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }

  async function validateTechnicalData() {
    if (validating.value) return;
    validating.value = true;
    error.value = "";
    validationMessage.value = "";
    try {
      const result = await documentInstancesService.validate(instanceId);
      validationMessage.value = result.valid === true
        ? "La instancia cumple la validación técnica reportada por el backend."
        : "La instancia tiene errores o campos pendientes según el backend.";
      await load();
    } catch (reason) { error.value = getApiError(reason); }
    finally { validating.value = false; }
  }

  onMounted(load);
  return { instance, loading, validating, error, validationMessage, load, validateTechnicalData };
}
