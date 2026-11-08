import { api } from "./api";
import type {
  AddProcessInstitutionPayload,
  AddProcessParticipantPayload,
  CreateDonationProcessPayload,
  DashboardSummary,
  DependencyEvaluationResult,
  DonationProcess,
  ProcessDocument,
  ProcessDocumentsSummary,
  ProcessInstitution,
  ProcessParticipant,
  UpdateDocumentApplicabilityPayload,
  UpdateDonationProcessPayload,
} from "../types/donation-process";

export async function listDonationProcesses(query?: {
  status?: string;
  donorId?: string;
  primaryIpsName?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: DonationProcess[]; total: number; page: number; pageSize: number }> {
  const response = await api.get<{
    items: DonationProcess[];
    total: number;
    page: number;
    pageSize: number;
  }>("/donation-processes", { params: query });
  return response.data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>("/donation-processes/dashboard/summary");
  return response.data;
}

export async function getDonationProcess(id: string): Promise<DonationProcess> {
  const response = await api.get<DonationProcess>(`/donation-processes/${id}`);
  return response.data;
}

export async function createDonationProcess(
  payload: CreateDonationProcessPayload,
): Promise<DonationProcess> {
  const response = await api.post<DonationProcess>("/donation-processes", payload);
  return response.data;
}

export async function updateDonationProcess(
  id: string,
  payload: UpdateDonationProcessPayload,
): Promise<DonationProcess> {
  const response = await api.patch<DonationProcess>(`/donation-processes/${id}`, payload);
  return response.data;
}

export async function addProcessInstitution(
  processId: string,
  payload: AddProcessInstitutionPayload,
): Promise<ProcessInstitution> {
  const response = await api.post<ProcessInstitution>(
    `/donation-processes/${processId}/institutions`,
    payload,
  );
  return response.data;
}

export async function addProcessParticipant(
  processId: string,
  payload: AddProcessParticipantPayload,
): Promise<ProcessParticipant> {
  const response = await api.post<ProcessParticipant>(
    `/donation-processes/${processId}/participants`,
    payload,
  );
  return response.data;
}

export async function getProcessDocuments(processId: string): Promise<ProcessDocumentsSummary> {
  const response = await api.get<ProcessDocumentsSummary>(
    `/donation-processes/${processId}/documents`,
  );
  return response.data;
}

export async function updateDocumentApplicability(
  processId: string,
  documentId: string,
  payload: UpdateDocumentApplicabilityPayload,
): Promise<ProcessDocument> {
  const response = await api.patch<ProcessDocument>(
    `/donation-processes/${processId}/documents/${documentId}/applicability`,
    payload,
  );
  return response.data;
}

export async function initiateProcessDocument(
  processId: string,
  documentId: string,
): Promise<{ document: ProcessDocument; instanceId: string }> {
  const response = await api.post<{ document: ProcessDocument; instanceId: string }>(
    `/donation-processes/${processId}/documents/${documentId}/initiate`,
  );
  return response.data;
}

export async function evaluateDocumentDependencies(
  processId: string,
  documentId: string,
): Promise<DependencyEvaluationResult> {
  const response = await api.get<DependencyEvaluationResult>(
    `/donation-processes/${processId}/documents/${documentId}/dependencies`,
  );
  return response.data;
}

export async function getActiveProcessPackage(): Promise<any> {
  const response = await api.get<any>("/process-packages/active");
  return response.data;
}

export interface IntakeFromClinicalHistoryPayload {
  primaryIpsName: string;
  file: File;
  notes?: string;
  processCode?: string;
}

export interface IntakeFromClinicalHistoryResponse {
  process: DonationProcess;
  donorId: string;
  sourceDocument: any;
  ocrJob: any;
  candidates: any[];
}

export async function intakeFromClinicalHistory(
  payload: IntakeFromClinicalHistoryPayload,
): Promise<IntakeFromClinicalHistoryResponse> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("primaryIpsName", payload.primaryIpsName);
  if (payload.notes) formData.append("notes", payload.notes);
  if (payload.processCode) formData.append("processCode", payload.processCode);

  const response = await api.post<IntakeFromClinicalHistoryResponse>(
    "/donation-processes/intake-from-clinical-history",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}
