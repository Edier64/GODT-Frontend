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
  status: "OFFICIAL_HOMOLOGATED" | "PENDING_HOMOLOGATION" | "COMPLEMENTARY_SOURCE";
  renderMode: "STATIC_OVERLAY" | "VECTOR_GENERATED" | "SOURCE_ATTACHMENT";
}
