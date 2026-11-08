import { api } from "./api";
import {
  CreateInstitutionPayload,
  InstitutionSearchResult,
  InstitutionalDocumentMetadata,
} from "../types/institutions";

export async function searchInstitutions(
  query: string,
): Promise<{ results: InstitutionSearchResult[]; queryNormalized: string }> {
  const res = await api.get<{ results: InstitutionSearchResult[]; queryNormalized: string }>(
    "/institutions/search",
    { params: { q: query } },
  );
  return res.data;
}

export async function createInstitution(
  payload: CreateInstitutionPayload,
): Promise<InstitutionSearchResult> {
  const res = await api.post<InstitutionSearchResult>("/institutions", payload);
  return res.data;
}

export async function requestInstitutionAssociation(
  institutionId: string,
): Promise<{ message: string; status: string }> {
  const res = await api.post<{ message: string; status: string }>(
    `/institutions/${institutionId}/request-association`,
  );
  return res.data;
}

export async function getClinicalServices(query: string = ""): Promise<string[]> {
  const res = await api.get<{ items: string[] }>("/catalogs/clinical-services", {
    params: { q: query },
  });
  return res.data.items;
}

export async function getProfessionals(query: string = ""): Promise<
  Array<{ id: string; fullName: string; role: string; professionalId: string | null }>
> {
  const res = await api.get<{
    items: Array<{ id: string; fullName: string; role: string; professionalId: string | null }>;
  }>("/catalogs/professionals", {
    params: { q: query },
  });
  return res.data.items;
}

export async function getInstitutionalInventory(): Promise<{
  totalTemplates: number;
  complementaryDocuments: number;
  items: InstitutionalDocumentMetadata[];
}> {
  const res = await api.get<{
    totalTemplates: number;
    complementaryDocuments: number;
    items: InstitutionalDocumentMetadata[];
  }>("/document-templates/institutional-inventory");
  return res.data;
}

export async function getOriginalTemplateMetadata(
  code: string,
): Promise<InstitutionalDocumentMetadata> {
  const res = await api.get<InstitutionalDocumentMetadata>(
    `/document-templates/${code}/original-metadata`,
  );
  return res.data;
}

export function getOriginalTemplateFileUrl(code: string, download = false): string {
  const base = api.defaults.baseURL || "/api/v1";
  return `${base}/document-templates/${code}/original-file?download=${download}`;
}

export function getPreviewPdfUrl(instanceId: string, download = false): string {
  const base = api.defaults.baseURL || "/api/v1";
  return `${base}/document-instances/${instanceId}/preview-pdf?download=${download}`;
}
