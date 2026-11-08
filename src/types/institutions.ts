export interface InstitutionSearchResult {
  id: string;
  name: string;
  code: string | null;
  city: string;
  department: string | null;
  complexityLevel: string | null;
  hasUserAccess: boolean;
  matchType: "EXACT" | "ALIAS" | "PARTIAL" | "APPROXIMATE";
  matchedAlias?: string;
  suggestionMessage?: string;
}

export interface CreateInstitutionPayload {
  name: string;
  code?: string;
  city: string;
  department?: string;
  complexityLevel?: string;
  aliases?: string[];
  confirmNonDuplicate?: boolean;
}

export interface PageDimension {
  page: number;
  width: number;
  height: number;
  orientation: "PORTRAIT" | "LANDSCAPE";
}

export type FidelityStatus =
  | "SOURCE_REGISTERED"
  | "PREVIEW_READY"
  | "FIELD_MAPPING_IN_PROGRESS"
  | "RENDER_READY"
  | "REVIEW_REQUIRED";

export interface DerivativeMetadata {
  originalFormat: "DOCX" | "PDF";
  isDerivativePdfAvailable: boolean;
  sourceSha256: string;
  relationship: "ORIGINAL_SOURCE" | "DILIGENCED_INSTANCE" | "VECTOR_PREVIEW";
  conversionEngineRequired?: string;
  notes?: string;
}

export interface InstitutionalDocumentMetadata {
  documentCode: string;
  templateCode: string;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  pageCount: number;
  dimensions: PageDimension[];
  hasAcroForm: boolean;
  status:
    | "OFFICIAL_HOMOLOGATED"
    | "INSTITUTIONAL_REGISTERED_TEMPLATE"
    | "PENDING_HOMOLOGATION"
    | "COMPLEMENTARY_SOURCE";
  renderMode: "STATIC_OVERLAY" | "VECTOR_GENERATED" | "SOURCE_ATTACHMENT";
  fidelityStatus?: FidelityStatus;
  derivativeMetadata?: DerivativeMetadata;
}

