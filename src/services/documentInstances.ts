import { api } from "./api";
import type { CreateInstanceInput, DocumentInstance, ResolveConflictInput, SaveRevisionInput } from "../types/document-engine";
import { documentLifecycleService } from "./documentLifecycle";

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
    const { data } = await api.post<DocumentInstance>(`/donors/${donorId}/document-instances`, input);
    return data;
  },
  async save(id: string, input: SaveRevisionInput): Promise<DocumentInstance> {
    const { data } = await api.patch<DocumentInstance>(`/document-instances/${id}`, input);
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
