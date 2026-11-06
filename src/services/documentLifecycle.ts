import { api } from "./api";
import type {
  AssignParticipantPayload,
  AppendCustodyEventPayload,
  CustodyEvent,
  DocumentParticipant,
  DocumentSignature,
  GeneratedPdfDocument,
  SignSnapshotPayload,
} from "../types/document-lifecycle";

export const documentLifecycleService = {
  async validate(instanceId: string): Promise<{
    id: string;
    status: string;
    validationSummary: Record<string, unknown>;
  }> {
    const { data } = await api.post(`/document-instances/${instanceId}/lifecycle/validate`);
    return data;
  },

  async complete(instanceId: string): Promise<{
    id: string;
    status: string;
    completedAt: string;
    participantsCount: number;
    mandatorySignersCount: number;
  }> {
    const { data } = await api.post(`/document-instances/${instanceId}/lifecycle/complete`);
    return data;
  },

  async generateSnapshot(instanceId: string): Promise<GeneratedPdfDocument> {
    const { data } = await api.post<GeneratedPdfDocument>(
      `/document-instances/${instanceId}/lifecycle/snapshot`,
    );
    return data;
  },

  async release(instanceId: string): Promise<{
    id: string;
    status: string;
    releasedAt: string;
    activeSnapshotId: string;
  }> {
    const { data } = await api.post(`/document-instances/${instanceId}/lifecycle/release`);
    return data;
  },

  async listParticipants(instanceId: string): Promise<DocumentParticipant[]> {
    const { data } = await api.get<DocumentParticipant[]>(
      `/document-instances/${instanceId}/lifecycle/participants`,
    );
    return data;
  },

  async assignParticipant(
    instanceId: string,
    payload: AssignParticipantPayload,
  ): Promise<DocumentParticipant> {
    const { data } = await api.post<DocumentParticipant>(
      `/document-instances/${instanceId}/lifecycle/participants`,
      payload,
    );
    return data;
  },

  async removeParticipant(instanceId: string, participantId: string): Promise<void> {
    await api.delete(
      `/document-instances/${instanceId}/lifecycle/participants/${participantId}`,
    );
  },

  async signSnapshot(
    instanceId: string,
    snapshotId: string,
    payload: SignSnapshotPayload,
  ): Promise<DocumentSignature> {
    const { data } = await api.post<DocumentSignature>(
      `/document-instances/${instanceId}/lifecycle/snapshots/${snapshotId}/sign`,
      payload,
    );
    return data;
  },

  async listSnapshots(instanceId: string): Promise<GeneratedPdfDocument[]> {
    const { data } = await api.get<GeneratedPdfDocument[]>(
      `/document-instances/${instanceId}/lifecycle/snapshots`,
    );
    return data;
  },

  async getSnapshot(
    instanceId: string,
    snapshotId: string,
  ): Promise<GeneratedPdfDocument> {
    const { data } = await api.get<GeneratedPdfDocument>(
      `/document-instances/${instanceId}/lifecycle/snapshots/${snapshotId}`,
    );
    return data;
  },

  async downloadPdfBlob(instanceId: string, snapshotId: string): Promise<Blob> {
    const response = await api.get(
      `/document-instances/${instanceId}/lifecycle/snapshots/${snapshotId}/download`,
      { responseType: "blob" },
    );
    return response.data;
  },

  async listCustodyEvents(instanceId: string): Promise<CustodyEvent[]> {
    const { data } = await api.get<CustodyEvent[]>(
      `/document-instances/${instanceId}/lifecycle/custody-events`,
    );
    return data;
  },

  async appendCustodyEvent(
    instanceId: string,
    payload: AppendCustodyEventPayload,
  ): Promise<CustodyEvent> {
    const { data } = await api.post<CustodyEvent>(
      `/document-instances/${instanceId}/lifecycle/custody-events`,
      payload,
    );
    return data;
  },
};
