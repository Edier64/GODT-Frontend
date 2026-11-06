export type CanonicalScope = "DONOR" | "PROCESS" | "DOCUMENT";
export type CanonicalDataType =
  | "STRING"
  | "INTEGER"
  | "DECIMAL"
  | "BOOLEAN"
  | "DATETIME"
  | "DATE"
  | "OBJECT"
  | "ARRAY";
export type CanonicalSharingPolicy = "SHARED" | "COPY_ONCE" | "LOCAL" | "READONLY_DERIVED";
export type CanonicalCardinality = "SINGLE" | "REPEATABLE";
export type CanonicalConflictStatus = "NONE" | "CONFLICT_DETECTED" | "RESOLVED";
export type CanonicalSourceKind = "MANUAL" | "PROCESS_CANONICAL" | "DONOR_RECORD" | "OCR" | "IMPORT" | "COMPUTED";
export type ConflictResolutionStrategy = "ACCEPT_CANDIDATE" | "KEEP_CURRENT" | "MANUAL_OVERRIDE";

export interface CanonicalFieldDefinition {
  id: string;
  canonicalFieldKey: string;
  displayName: string;
  description?: string | null;
  scope: CanonicalScope;
  dataType: CanonicalDataType;
  cardinality: CanonicalCardinality;
  sharingPolicy: CanonicalSharingPolicy;
  unit?: string | null;
  formatValidation?: string | null;
  clinicalDomain?: string | null;
  isActive: boolean;
}

export interface ProcessCanonicalValue {
  id: string;
  processId: string;
  canonicalFieldKey: string;
  scope: CanonicalScope;
  dataType: CanonicalDataType;
  cardinality: CanonicalCardinality;
  sharingPolicy: CanonicalSharingPolicy;
  currentValue: unknown;
  unit?: string | null;
  sampleContext?: string | null;
  effectiveAt: string;
  sourceKind: CanonicalSourceKind;
  sourceInstanceId?: string | null;
  sourceRevisionId?: string | null;
  sourceDocumentId?: string | null;
  conflictStatus: CanonicalConflictStatus;
  conflictDetails?: Record<string, unknown> | null;
  versionNumber: number;
  lastValidatedById?: string | null;
  lastValidatedAt?: string | null;
  fieldDefinition?: CanonicalFieldDefinition;
}

export interface ProcessCanonicalHistory {
  id: string;
  processId: string;
  canonicalFieldKey: string;
  value: unknown;
  unit?: string | null;
  sampleContext?: string | null;
  effectiveAt: string;
  sourceKind: CanonicalSourceKind;
  sourceInstanceId?: string | null;
  sourceRevisionId?: string | null;
  sourceDocumentId?: string | null;
  versionNumber: number;
  actorUserId: string;
  createdAt: string;
}

export interface CanonicalConflict {
  instanceId: string;
  documentCode: string;
  fieldPath: string;
  existingValue: unknown;
  proposedValue: unknown;
}

export interface CanonicalObservation {
  id: string;
  processId: string;
  canonicalFieldKey: string;
  value: unknown;
  unit?: string | null;
  sampleContext?: string | null;
  effectiveAt: string;
  sourceKind: CanonicalSourceKind;
  sourceInstanceId?: string | null;
  sourceRevisionId?: string | null;
  actorUserId?: string | null;
  createdAt: string;
}

export interface PropagatedInstanceInfo {
  instanceId: string;
  documentCode: string;
  fieldPath: string;
  status: "UPDATED" | "SKIPPED_LOCKED" | "CONFLICT" | "NOT_APPLICABLE";
}

export interface PropagationResult {
  canonicalFieldKey: string;
  currentValue: unknown;
  scope: CanonicalScope;
  sharingPolicy: CanonicalSharingPolicy;
  versionNumber: number;
  propagatedCount: number;
  propagatedInstances: PropagatedInstanceInfo[];
  conflicts: CanonicalConflict[];
}

export interface ApplyCanonicalValuePayload {
  canonicalFieldKey: string;
  value: unknown;
  unit?: string | null;
  sampleContext?: string | null;
  effectiveAt?: string;
  sourceKind?: CanonicalSourceKind;
  conflictResolution?: {
    strategy: ConflictResolutionStrategy;
    justification?: string;
  };
}

export interface ResolveCanonicalConflictPayload {
  canonicalFieldKey: string;
  strategy: ConflictResolutionStrategy;
  manualValue?: unknown;
  justification: string;
}

