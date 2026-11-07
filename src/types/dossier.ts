export type DossierExportType = "FULL_ZIP" | "CONSOLIDATED_PDF" | "INDEX_ONLY";

export type DossierExportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface DossierSignatureItem {
  participantId?: string;
  signerRole: string;
  signerName: string;
  signerDocument?: string | null;
  signatureType: string;
  signedAt: string | null;
  snapshotSha256: string | null;
  hasCryptographicSignature?: boolean;
  attestationLevel?: "ATESTA_MANUAL_INTERNA" | "FIRMA_ELECTRONICA_SIMPLE" | "DIGITAL_CERTIFICADA_BLOQUEADA";
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
    pageCount?: number;
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

export interface DossierManifestFileItem {
  fileName: string;
  relativePath: string;
  fileType: string;
  sha256: string;
  sizeBytes: number;
  documentCode?: string;
  positionNumber?: number;
  versionNumber?: number;
  status?: string;
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
  hasConsolidatedPdf?: boolean;
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
  manifestDigest?: string;
  manifestSha256?: string;
  summary: DossierSummary;
  consolidatedPdf?: {
    fileName: string;
    sha256: string;
    sizeBytes: number;
    pageCount?: number;
    totalPageCount?: number;
  } | null;
  documents: DossierDocumentItem[];
  sourceDocuments: DossierSourceDocumentItem[];
  files?: DossierManifestFileItem[];
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
  packageChecksumSha256?: string | null;
  manifestDigest?: string | null;
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

export interface HardenedVerificationItem {
  relativePath: string;
  fileName: string;
  itemType: string;
  expectedSha256: string;
  actualSha256: string;
  matches: boolean;
  status: "OK" | "ALTERED" | "MISSING" | "UNEXPECTED" | "MISMATCH" | "FILE_NOT_FOUND" | "ERROR";
  details?: string;
}

export interface IntegrityVerificationReport {
  exportId: string;
  processCode: string;
  verifiedAt: string;
  verifiedBy: string;
  overallStatus: "INTEGRITY_VERIFIED" | "INTEGRITY_COMPROMISED" | "VERIFICATION_FAILED";
  expectedPackageSha256?: string;
  actualPackageSha256?: string;
  packageHashMatches?: boolean;
  expectedManifestDigest?: string;
  actualManifestDigest?: string;
  manifestDigestMatches?: boolean;
  totalChecked?: number;
  totalFilesInspected?: number;
  passedCount?: number;
  correctFilesCount?: number;
  failedCount?: number;
  alteredFilesCount?: number;
  missingFilesCount?: number;
  unexpectedFilesCount?: number;
  items: HardenedVerificationItem[];
}
