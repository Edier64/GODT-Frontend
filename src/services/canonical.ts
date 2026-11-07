import { api } from "./api";
import type {
  ApplyCanonicalValuePayload,
  CanonicalFieldDefinition,
  CanonicalObservation,
  ProcessCanonicalHistory,
  ProcessCanonicalValue,
  PropagationResult,
  ResolveCanonicalConflictPayload,
} from "../types/canonical";

export async function listCanonicalCatalog(): Promise<CanonicalFieldDefinition[]> {
  const response = await api.get<CanonicalFieldDefinition[]>("/canonical-fields/catalog");
  return response.data;
}

export async function getProcessCanonicalValues(
  processId: string,
): Promise<ProcessCanonicalValue[]> {
  const response = await api.get<ProcessCanonicalValue[]>(
    `/donation-processes/${processId}/canonical-values`,
  );
  return response.data;
}

export async function getProcessCanonicalValue(
  processId: string,
  fieldKey: string,
): Promise<ProcessCanonicalValue> {
  const response = await api.get<ProcessCanonicalValue>(
    `/donation-processes/${processId}/canonical-values/${encodeURIComponent(fieldKey)}`,
  );
  return response.data;
}

export async function getProcessCanonicalHistory(
  processId: string,
  fieldKey: string,
): Promise<ProcessCanonicalHistory[]> {
  const response = await api.get<ProcessCanonicalHistory[]>(
    `/donation-processes/${processId}/canonical-values/${encodeURIComponent(fieldKey)}/history`,
  );
  return response.data;
}

export async function applyCanonicalValueFromInstance(
  instanceId: string,
  payload: ApplyCanonicalValuePayload,
): Promise<PropagationResult> {
  const response = await api.post<PropagationResult>(
    `/document-instances/${instanceId}/canonical-values`,
    payload,
  );
  return response.data;
}

export async function applyCanonicalValueDirect(
  processId: string,
  payload: ApplyCanonicalValuePayload,
): Promise<PropagationResult> {
  const response = await api.post<PropagationResult>(
    `/donation-processes/${processId}/canonical-values`,
    payload,
  );
  return response.data;
}

export async function resolveCanonicalConflict(
  processId: string,
  payload: ResolveCanonicalConflictPayload,
): Promise<PropagationResult> {
  const url = payload.canonicalFieldKey
    ? `/donation-processes/${processId}/canonical-values/${encodeURIComponent(payload.canonicalFieldKey)}/resolve-conflict`
    : `/donation-processes/${processId}/canonical-values/resolve-conflict`;
  const response = await api.post<PropagationResult>(url, {
    ...payload,
    resolvedValue: payload.manualValue,
  });
  return response.data;
}

export async function getProcessCanonicalObservations(
  processId: string,
  fieldKey: string,
  sampleContext?: string,
): Promise<CanonicalObservation[]> {
  const params = sampleContext ? { sampleContext } : {};
  const response = await api.get<CanonicalObservation[]>(
    `/donation-processes/${processId}/canonical-values/${encodeURIComponent(fieldKey)}/observations`,
    { params },
  );
  return response.data;
}

