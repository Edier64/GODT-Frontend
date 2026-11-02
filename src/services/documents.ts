import { api } from "./api";
import type { DocumentUploadInput, SourceDocument } from "../types/documents";

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const documentsService = {
  async list(donorId: string): Promise<SourceDocument[]> {
    const { data } = await api.get<SourceDocument[]>(`/donors/${donorId}/documents`);
    return data;
  },

  async get(id: string): Promise<SourceDocument> {
    const { data } = await api.get<SourceDocument>(`/documents/${id}`);
    return data;
  },

  async upload(
    donorId: string,
    input: DocumentUploadInput,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<SourceDocument> {
    const body = new FormData();
    body.append("file", input.file);
    body.append("documentCategory", input.documentCategory);
    const { data } = await api.post<SourceDocument>(`/donors/${donorId}/documents`, body, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        const total = event.total ?? input.file.size;
        onProgress?.({
          loaded: event.loaded,
          total,
          percentage: total ? Math.round((event.loaded / total) * 100) : 0
        });
      }
    });
    return data;
  },

  async download(id: string, filename: string): Promise<void> {
    const { data } = await api.get<Blob>(`/documents/${id}/download`, { responseType: "blob" });
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
};
