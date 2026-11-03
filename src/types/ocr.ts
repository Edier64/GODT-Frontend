export type OcrJobStatus = "EN_COLA" | "COMPLETADO" | "FALLIDO";
export type OcrValidationStatus = "PENDIENTE" | "CONFIRMADO" | "MODIFICADO" | "RECHAZADO";
export type OcrDecision = Exclude<OcrValidationStatus, "PENDIENTE">;

export interface OcrJob {
  id: string;
  sourceDocumentId: string;
  status: OcrJobStatus;
  providerName: string;
  errorCode: string | null;
  createdAt: string;
}

export interface OcrField {
  id: string;
  ocrJobId: string;
  sourceDocumentId: string;
  donorId: string;
  canonicalFieldKey: string;
  candidateValue: string;
  confidenceScore: number | string;
  boundingBox: Record<string, unknown> | null;
  validationStatus: OcrValidationStatus;
  confirmedValue: string | null;
  validatedById: string | null;
  validatedAt: string | null;
}

export interface OcrJobFieldsResponse {
  jobId: string;
  sourceDocumentId: string;
  status: OcrJobStatus;
  errorCode: string | null;
  fields: OcrField[];
}

export interface ValidateOcrFieldInput {
  status: OcrDecision;
  confirmedValue?: string;
}
