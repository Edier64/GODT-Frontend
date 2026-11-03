import { onMounted, ref } from "vue";
import { getApiError } from "../services/api";
import { documentCatalogService } from "../services/documentCatalog";
import type { DocumentTemplate, TemplateVersion } from "../types/document-engine";

export function useDocumentCatalogController() {
  const templates = ref<DocumentTemplate[]>([]);
  const selected = ref<DocumentTemplate | null>(null);
  const versions = ref<TemplateVersion[]>([]);
  const loading = ref(false);
  const error = ref("");
  const offline = ref(false);

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      templates.value = await documentCatalogService.list();
      offline.value = !navigator.onLine;
    }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }
  async function select(template: DocumentTemplate) {
    selected.value = template;
    try { versions.value = await documentCatalogService.versions(template.id); }
    catch (reason) { error.value = getApiError(reason); }
  }
  onMounted(load);
  return { templates, selected, versions, loading, error, offline, load, select };
}
