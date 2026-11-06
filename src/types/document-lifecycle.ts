export type DocumentLifecycleStatus =
  | "BORRADOR"
  | "VALIDADO"
  | "COMPLETADO"
  | "PENDIENTE_FIRMAS"
  | "FIRMADO"
  | "LIBERADO"
  | "CANCELADO";

export type DocumentParticipantRole =
  | "CIRUJANO_RESCATE"
  | "COORDINADOR_OPERATIVO"
  | "MEDICO_TRATANTE"
  | "PATOLOGO"
  | "TESTIGO"
  | "RECEPTOR_CUSTODIA"
  | "ENTREGADOR_CUSTODIA"
  | string;

export type SignatureType =
  | "ATESTACION_USUARIO"
  | "MANUSCRITA_PRESENCIAL"
  | "DIBUJADA_UI"
  | "DIGITAL_CERTIFICADA";

export interface DocumentParticipant {
  id: string;
  documentInstanceId: string;
  processParticipantId?: string | null;
  role: DocumentParticipantRole;
  fullName: string;
  documentType: string;
  documentNumber: string;
  professionalId?: string | null;
  institution?: string | null;
  requiresSignature: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface DocumentSignature {
  id: string;
  documentInstanceId: string;
  generatedPdfId: string;
  participantId?: string | null;
  signerUserId?: string | null;
  signerName: string;
  signerRole: string;
  signerDocumentType: string;
  signerDocumentNumber: string;
  signerProfessionalId?: string | null;
  signatureType: SignatureType;
  signatureData?: string | null;
  signedAt: string;
  ipAddress?: string | null;
  verificationHash: string;
  evidenceData?: {
    attestationText?: string;
    attestationDigest?: string;
    legalNotice?: string;
    [key: string]: unknown;
  } | null;
  signerUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface GeneratedPdfDocument {
  id: string;
  documentInstanceId: string;
  processId?: string | null;
  versionNumber: number;
  filePath: string;
  fileSizeBytes: number;
  sha256Hash: string;
  generatedByUserId?: string | null;
  generatedAt: string;
  status: string;
  dataSnapshot?: Record<string, unknown>;
  signatures?: DocumentSignature[];
}

export type CustodyStage =
  | "INSPECCION_INICIAL"
  | "EMBALAJE_PRIMARIO"
  | "ROTULADO"
  | "SELLADO_TERMICO"
  | "CONTROL_TEMPERATURA"
  | "DESPACHO"
  | "TRANSPORTE"
  | "RECEPCION"
  | "VERIFICACION_INTEGRIDAD"
  | string;

export interface CustodyEvent {
  id: string;
  documentInstanceId: string;
  sequenceNumber: number;
  stage: CustodyStage;
  responsibleName: string;
  responsibleDocument: string;
  responsibleRole: string;
  institution: string;
  eventTimestamp: string;
  temperatureCelsius?: number | null;
  containerSealNumber?: string | null;
  integrityVerified: boolean;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  verifierNotes?: string | null;
  verifiedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  notes?: string | null;
  recordedByUserId?: string | null;
  recordedAt: string;
}

export interface AssignParticipantPayload {
  role: string;
  fullName: string;
  documentType?: string;
  documentNumber: string;
  professionalId?: string;
  institution?: string;
  requiresSignature?: boolean;
  notes?: string;
}

export interface SignSnapshotPayload {
  participantId?: string;
  signatureType: SignatureType;
  signatureData?: string;
  attestationText?: string;
  signerName?: string;
  signerRole?: string;
  signerDocumentType?: string;
  signerDocumentNumber?: string;
  signerProfessionalId?: string;
}

export interface AppendCustodyEventPayload {
  sequenceNumber?: number;
  stage: string;
  responsibleName: string;
  responsibleDocument: string;
  responsibleRole: string;
  institution: string;
  eventTimestamp: string;
  temperatureCelsius?: number;
  containerSealNumber?: string;
  integrityVerified?: boolean;
  verifierNotes?: string;
  notes?: string;
}

export interface ReopenDocumentPayload {
  justification: string;
}
