export type DossierExportType = "FULL_ZIP" | "CONSOLIDATED_PDF" | "INDEX_ONLY";

export type DossierExportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface DossierSignatureItem {
  signerRole: string;
  signerName: string;
  signerDocument?: string | null;
  signatureType: string;
  signedAt: string | null;
  snapshotSha256: string;
}

export interface DossierOriginalFileItem {
  fileName: string;
  sha256: string;
  sizeBytes: number;
  versionNumber: number;
  generatedAt: string;
  storageKey?: string;
}

export interface DossierDocumentItem {
  positionNumber: number;
  documentCode: string;
  title: string;
  status: string;
  applicabilityStatus: string;
  nonApplicabilityReason?: string | null;
  category: string;
  includedInConsolidatedPdf: boolean;
  consolidatedPageRange?: {
    startPage: number;
    endPage: number;
    pageCount: number;
  } | null;
  originalFile?: DossierOriginalFileItem | null;
  signatures: DossierSignatureItem[];
  custodyEventsCount: number;
}

export interface DossierSourceDocumentItem {
  id: string;
  category: string;
  originalFilename: string;
  sha256: string;
  sizeBytes: number;
  uploadedAt: string;
  includedInPackage: boolean;
}

export interface DossierSummary {
  totalPositions: number;
  normativePositions: number;
  applicableCount: number;
  releasedCount: number;
  signedCount: number;
  completedCount: number;
  nonApplicableCount: number;
  pendingHomologationCount: number;
  sourceDocumentsIncludedCount: number;
}

export interface DossierManifest {
  manifestVersion: string;
  processId: string;
  processCode: string;
  donorId: string;
  donorRndCode: string;
  primaryIpsName: string;
  generatedAt: string;
  generatedBy: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
  packageVersion: string;
  systemVersion: string;
  manifestSha256?: string;
  summary: DossierSummary;
  consolidatedPdf?: {
    fileName: string;
    sha256: string;
    sizeBytes: number;
    totalPageCount: number;
  } | null;
  zipPackage?: {
    fileName: string;
    sha256: string;
    sizeBytes: number;
  } | null;
  documents: DossierDocumentItem[];
  sourceDocuments: DossierSourceDocumentItem[];
}

export interface ProcessDossierExport {
  id: string;
  processId: string;
  requestedById: string;
  exportType: DossierExportType;
  status: DossierExportStatus;
  progressPercent: number;
  currentStep: string | null;
  errorMessage?: string | null;
  includeSourceDocuments: boolean;
  selectedDocumentCodes: string[];
  selectedSourceDocumentIds: string[];
  zipStorageKey?: string | null;
  zipSha256?: string | null;
  zipSizeBytes?: number | null;
  consolidatedPdfStorageKey?: string | null;
  consolidatedPdfSha256?: string | null;
  manifestData?: DossierManifest | null;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
  requestedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export interface RequestDossierExportPayload {
  exportType?: DossierExportType;
  includeSourceDocuments?: boolean;
  selectedDocumentCodes?: string[];
  selectedSourceDocumentIds?: string[];
}

export interface IntegrityVerificationItem {
  itemType: "ORIGINAL_PDF" | "CONSOLIDATED_PDF" | "ZIP_ARCHIVE" | "SOURCE_DOCUMENT";
  codeOrName: string;
  expectedSha256: string;
  actualSha256: string;
  matches: boolean;
  status: "OK" | "MISMATCH" | "FILE_NOT_FOUND";
  details?: string;
}

export interface IntegrityVerificationReport {
  exportId: string;
  processCode: string;
  verifiedAt: string;
  verifiedBy: string;
  overallStatus: "INTEGRITY_VERIFIED" | "INTEGRITY_COMPROMISED";
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  items: IntegrityVerificationItem[];
}
