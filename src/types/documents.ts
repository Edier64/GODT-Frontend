export type DocumentMimeType = "application/pdf" | "image/png" | "image/jpeg";

export interface SourceDocument {
  id: string;
  donorId: string;
  uploadedById: string;
  originalFilename: string;
  mimeType: string;
  documentCategory: string;
  objectStorageKey: string;
  sha256Hash: string;
  status: string;
  uploadedAt: string;
}

export interface DocumentUploadInput {
  file: File;
  documentCategory: string;
}
