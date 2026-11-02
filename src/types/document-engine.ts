export type TemplateVersionStatus = "DRAFT" | "VALIDATED" | "PUBLISHED" | string;
export type DocumentInstanceStatus = "DRAFT" | "IN_REVIEW" | string;
export type JsonSchemaType = "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";

export interface JsonSchema {
  $schema?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  nullable?: boolean;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  additionalProperties?: boolean;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
}

export interface UiSchema {
  sections?: Array<{ id: string; title?: string; description?: string; fields?: string[] }>;
}

export interface MappingConfig {
  targetKey: string;
  sourcePath: string;
  sourceKind: string;
  dataType: string;
  writable?: boolean;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: string;
  effectiveFrom: string;
  status: TemplateVersionStatus;
  jsonSchema: JsonSchema;
  uiSchema: UiSchema;
  mappingConfig: MappingConfig[];
  dependencyConfig?: unknown;
  generationConfig?: Record<string, unknown>;
  publishedAt?: string | null;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  templateCode: string;
  name: string;
  category: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  versions: TemplateVersion[];
}

export interface DocumentProvenance {
  id?: string;
  fieldPath: string;
  sourceKind: string;
  sourceDocumentId?: string;
  ocrFieldId?: string;
  validatedById?: string | null;
  validatedAt?: string | null;
  conflictStatus?: string;
  conflictDetails?: unknown;
  sourceValue?: unknown;
  conflictResolvedById?: string | null;
  conflictResolvedAt?: string | null;
  conflictDecision?: string | null;
  conflictJustification?: string | null;
}

export interface DocumentRevision {
  id: string;
  revisionNumber: number;
  responseData: Record<string, unknown>;
  validationSummary?: { valid?: boolean; missingFields?: string[]; errors?: Array<{ path: string; message: string }> };
  createdAt: string;
  createdById?: string;
  provenance?: DocumentProvenance[];
}

export interface DocumentInstance {
  id: string;
  donorId: string;
  templateId: string;
  templateVersionId: string;
  documentCode: string;
  status: DocumentInstanceStatus;
  currentRevision?: DocumentRevision | null;
  revisions?: DocumentRevision[];
  templateVersion?: TemplateVersion;
}

export interface CreateInstanceInput {
  templateVersionId: string;
  responseData: Record<string, unknown>;
  sourceProvenance?: DocumentProvenance[];
}

export interface SaveRevisionInput {
  responseData: Record<string, unknown>;
  sourceProvenance?: DocumentProvenance[];
}

export interface ResolveConflictInput {
  fieldPath: string;
  decision: string;
  justification: string;
}
