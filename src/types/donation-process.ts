export interface DashboardSummary {
  processes: {
    total: number;
    byStatus: {
      EN_VALORACION: number;
      EN_CURSO: number;
      COMPLETADO: number;
      CANCELADO: number;
      SUSPENDIDO: number;
      [key: string]: number;
    };
  };
  donors: {
    total: number;
    byStatus: {
      EN_VALORACION: number;
      ACTIVO: number;
      CERRADO: number;
      [key: string]: number;
    };
  };
  documents: {
    total: number;
    byStatus: {
      PENDIENTE: number;
      EN_DILIGENCIAMIENTO?: number;
      EN_REVISION?: number;
      BLOQUEADO?: number;
      PENDIENTE_FIRMAS?: number;
      FIRMADO: number;
      COMPLETADO?: number;
      LIBERADO: number;
      NO_APLICA?: number;
      [key: string]: number | undefined;
    };
  };
  recentProcesses: Array<{
    id: string;
    processCode: string;
    status: string;
    primaryIpsName: string;
    donorName?: string;
    donorRndCode?: string;
    openedAt: string;
    updatedAt: string;
  }>;
}

export type DonationProcessStatus =
  | "EN_VALORACION"
  | "EN_CURSO"
  | "COMPLETADO"
  | "CANCELADO"
  | "SUSPENDIDO";

export type ProcessInstitutionRole =
  | "IPS_GENERADORA"
  | "IPS_EXTRACTORA"
  | "BANCO_TEJIDOS"
  | "IPS_TRASPLANTADORA"
  | "INMLCF"
  | "COORDINACION_REGIONAL"
  | "OTRO";

export type ProcessParticipantRole =
  | "COORDINADOR_OPERATIVO"
  | "MEDICO_CERTIFICADOR"
  | "MEDICO_TRATANTE"
  | "CIRUJANO_RESCATE"
  | "TECNICO_TEJIDOS"
  | "DEUDO_NOTIFICADO"
  | "REPRESENTANTE_LEGAL"
  | "TESTIGO"
  | "CUSTODIO"
  | "OTRO";

export interface ProcessInstitution {
  id: string;
  processId: string;
  institutionName: string;
  role: ProcessInstitutionRole;
  notes?: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessParticipant {
  id: string;
  processId: string;
  fullName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  role: ProcessParticipantRole;
  professionalId?: string | null;
  institution?: string | null;
  relationshipToDonor?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  systemUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonationProcess {
  id: string;
  processCode: string;
  donorId: string;
  status: DonationProcessStatus;
  primaryIpsName: string;
  openedById: string;
  closedById?: string | null;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  institutions?: ProcessInstitution[];
  participants?: ProcessParticipant[];
  donor?: {
    id: string;
    rndCode: string;
    fullName: string;
    documentNumber: string;
    originatingIpsName: string;
    status: string;
  };
}

export interface InitialDonorPayload {
  rndCode?: string;
  originatingIpsName?: string;
  clinicalService?: string;
  fullName?: string;
  documentNumber?: string;
  bloodGroup?: string;
  rhFactor?: string;
}

export interface CreateDonationProcessPayload {
  donorId?: string;
  donor?: InitialDonorPayload;
  primaryIpsName: string;
  processCode?: string;
  notes?: string;
  institutions?: Array<{
    institutionName: string;
    role: ProcessInstitutionRole;
    notes?: string;
  }>;
  participants?: Array<{
    fullName: string;
    role: ProcessParticipantRole;
    documentType?: string;
    documentNumber?: string;
    professionalId?: string;
    institution?: string;
    relationshipToDonor?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }>;
}

export interface UpdateDonationProcessPayload {
  status?: DonationProcessStatus;
  primaryIpsName?: string;
  notes?: string;
}

export interface AddProcessInstitutionPayload {
  institutionName: string;
  role: ProcessInstitutionRole;
  notes?: string;
}

export interface AddProcessParticipantPayload {
  fullName: string;
  role: ProcessParticipantRole;
  documentType?: string;
  documentNumber?: string;
  professionalId?: string;
  institution?: string;
  relationshipToDonor?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type DocumentApplicability =
  | "APLICABLE"
  | "NO_APLICA"
  | "CONDICIONAL"
  | "PENDIENTE_CRITERIO";

export type ProcessDocumentStatus =
  | "PENDIENTE"
  | "EN_DILIGENCIAMIENTO"
  | "EN_REVISION"
  | "BLOQUEADO"
  | "FIRMADO"
  | "COMPLETADO"
  | "NO_APLICA";

export interface ProcessDocument {
  id: string;
  processId: string;
  positionNumber: number;
  documentCode: string;
  title: string;
  category: string;
  orderIndex: number;
  isMandatory: boolean;
  status: ProcessDocumentStatus;
  applicabilityStatus: DocumentApplicability;
  nonApplicabilityReason?: string | null;
  rules?: Record<string, unknown> | null;
  templateId?: string | null;
  templateVersionId?: string | null;
  currentInstanceId?: string | null;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    templateCode: string;
    name: string;
    category: string;
  } | null;
  currentInstance?: {
    id: string;
    status: string;
    currentRevisionId?: string | null;
  } | null;
}

export interface ProcessDocumentsSummary {
  processId: string;
  totalPositions: number;
  applicableCount: number;
  completedCount: number;
  signedCount?: number;
  inProgressCount: number;
  pendingCount: number;
  nonApplicableCount: number;
  progressPercentage: number;
  documents: ProcessDocument[];
}

export interface DependencyEvaluationResult {
  documentId: string;
  documentCode: string;
  isSatisfied: boolean;
  canInitiateDraft?: boolean;
  canApproveOrSign?: boolean;
  blockingReasons: string[];
  applicabilityStatus: string;
  rules: unknown;
}

export interface UpdateDocumentApplicabilityPayload {
  applicabilityStatus: DocumentApplicability;
  nonApplicabilityReason?: string;
}


