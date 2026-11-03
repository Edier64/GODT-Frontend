import { api } from "./api";
import type { DocumentTemplate, TemplateVersion } from "../types/document-engine";
import { templateCache } from "./templateCache";

export const documentCatalogService = {
  async list(): Promise<DocumentTemplate[]> {
    try {
      const { data } = await api.get<DocumentTemplate[]>("/document-catalog");
      try { await templateCache.save(data); } catch { /* local cache is optional */ }
      return data;
    } catch (error) {
      const cached = await templateCache.list().catch(() => []);
      if (cached.length) return cached.map((entry) => entry.template);
      throw error;
    }
  },
  async versions(templateId: string): Promise<TemplateVersion[]> {
    try {
      const { data } = await api.get<TemplateVersion[]>(`/document-catalog/${templateId}/versions`);
      return data;
    } catch (error) {
      const cached = await templateCache.list().catch(() => []);
      const template = cached.find((entry) => entry.template.id === templateId)?.template;
      if (template) return template.versions;
      throw error;
    }
  }
};
