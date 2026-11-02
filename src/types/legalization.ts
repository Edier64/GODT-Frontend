export type LegalizationMechanism = "PRESUNCION_LEGAL" | "CONSENTIMIENTO_FAMILIAR";

export interface LegalRepresentativeInput {
  fullName: string;
  documentType: string;
  documentNumber: string;
  relationshipToDonor: string;
}

export interface EvaluateLegalizationInput {
  mechanism: LegalizationMechanism;
  isAdult: boolean;
  isColombian: boolean;
  isResident: boolean;
  oppositionRegistered: boolean;
  representatives: LegalRepresentativeInput[];
}

export interface LegalizationResult {
  id: string;
  donorId: string;
}
