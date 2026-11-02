import { ref } from "vue";
import { getApiError } from "../services/api";
import { documentInstancesService } from "../services/documentInstances";
import type { CreateInstanceInput, DocumentInstance, SaveRevisionInput } from "../types/document-engine";

export function useDocumentInstancesController(donorId: string) {
  const instances = ref<DocumentInstance[]>([]);
  const loading = ref(false);
  const error = ref("");
  async function load() {
    loading.value = true; error.value = "";
    try { instances.value = await documentInstancesService.list(donorId); }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }
  async function create(input: CreateInstanceInput) {
    try { return await documentInstancesService.create(donorId, input); }
    catch (reason) { error.value = getApiError(reason); return null; }
  }
  async function save(id: string, input: SaveRevisionInput) {
    try { return await documentInstancesService.save(id, input); }
    catch (reason) { error.value = getApiError(reason); return null; }
  }
  async function validate(id: string) {
    try { return await documentInstancesService.validate(id); }
    catch (reason) { error.value = getApiError(reason); return null; }
  }
  return { instances, loading, error, load, create, save, validate };
}
