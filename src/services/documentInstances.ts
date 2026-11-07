import { api } from "./api";
import type { CreateInstanceInput, DocumentInstance, ResolveConflictInput, SaveRevisionInput } from "../types/document-engine";
import { documentLifecycleService } from "./documentLifecycle";

function sanitizeProvenance(provenance?: Array<Record<string, unknown>>): Array<Record<string, unknown>> | undefined {
  if (!provenance || !Array.isArray(provenance) || provenance.length === 0) return undefined;
  return provenance.map((item) => {
    const clean: Record<string, unknown> = {
      fieldPath: item.fieldPath,
      sourceKind: item.sourceKind,
    };
    if (item.canonicalFieldKey) clean.canonicalFieldKey = item.canonicalFieldKey;
    if (item.sourceEntityId) clean.sourceEntityId = item.sourceEntityId;
    if (item.sourceDocumentId) clean.sourceDocumentId = item.sourceDocumentId;
    if (item.ocrFieldId) clean.ocrFieldId = item.ocrFieldId;
    if (item.conflictStatus) clean.conflictStatus = item.conflictStatus;
    if (item.conflictDetails && typeof item.conflictDetails === "object") {
      clean.conflictDetails = item.conflictDetails;
    }
    if (item.sourceValue !== undefined) clean.sourceValue = item.sourceValue;
    return clean;
  });
}

export const documentInstancesService = {
  lifecycle: documentLifecycleService,
  async list(donorId: string): Promise<DocumentInstance[]> {
    const { data } = await api.get<DocumentInstance[]>(`/donors/${donorId}/document-instances`);
    return data;
  },
  async get(id: string): Promise<DocumentInstance> {
    const { data } = await api.get<DocumentInstance>(`/document-instances/${id}`);
    return data;
  },
  async create(donorId: string, input: CreateInstanceInput): Promise<DocumentInstance> {
    const payload: { templateVersionId: string; responseData: Record<string, unknown>; sourceProvenance?: unknown[] } = {
      templateVersionId: input.templateVersionId,
      responseData: input.responseData,
    };
    const sanitized = sanitizeProvenance(input.sourceProvenance as any);
    if (sanitized !== undefined) {
      payload.sourceProvenance = sanitized;
    }
    const { data } = await api.post<DocumentInstance>(`/donors/${donorId}/document-instances`, payload);
    return data;
  },
  async save(id: string, input: SaveRevisionInput): Promise<DocumentInstance> {
    const payload: { responseData: Record<string, unknown>; sourceProvenance?: unknown[] } = {
      responseData: input.responseData,
    };
    const sanitized = sanitizeProvenance(input.sourceProvenance as any);
    if (sanitized !== undefined) {
      payload.sourceProvenance = sanitized;
    }
    const { data } = await api.patch<DocumentInstance>(`/document-instances/${id}`, payload);
    return data;
  },
  async validate(id: string): Promise<Record<string, unknown>> {
    const { data } = await api.post<Record<string, unknown>>(`/document-instances/${id}/validate`);
    return data;
  },
  async resolveConflict(id: string, input: ResolveConflictInput): Promise<Record<string, unknown>> {
    const { data } = await api.post<Record<string, unknown>>(`/document-instances/${id}/conflicts/resolve`, input);
    return data;
  }
};
