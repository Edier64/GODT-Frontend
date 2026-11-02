import { api } from "./api";
import type { DocumentTemplate, TemplateVersion } from "../types/document-engine";

export const documentCatalogService = {
  async list(): Promise<DocumentTemplate[]> {
    const { data } = await api.get<DocumentTemplate[]>("/document-catalog");
    return data;
  },
  async versions(templateId: string): Promise<TemplateVersion[]> {
    const { data } = await api.get<TemplateVersion[]>(`/document-catalog/${templateId}/versions`);
    return data;
  }
};
