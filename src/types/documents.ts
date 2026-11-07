export type DocumentMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/jpg"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword";

export interface SourceDocument {
  id: string;
  donorId: string;
  processId?: string | null;
  uploadedById: string;
  originalFilename: string;
  mimeType: string;
  documentCategory: string;
  objectStorageKey: string;
  sha256Hash: string;
  status: string;
  uploadedAt: string;
  ocrJobs?: any[];
}

export interface DocumentUploadInput {
  file: File;
  documentCategory: string;
}
