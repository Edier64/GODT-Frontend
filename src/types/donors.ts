export type DonorStatus = "EN_VALORACION" | "ACTIVO" | "CERRADO";

export interface Donor {
  id: string;
  rndCode: string;
  status: DonorStatus;
  originatingIpsName: string;
  clinicalService: string;
  fullName: string;
  documentNumber: string;
  anthropometry: Record<string, unknown> | null;
  bloodGroup: string | null;
  rhFactor: string | null;
  clinicalData: Record<string, unknown> | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonorInput {
  rndCode?: string;
  originatingIpsName: string;
  clinicalService: string;
  fullName: string;
  documentNumber: string;
  status?: DonorStatus;
  anthropometry?: Record<string, unknown>;
  bloodGroup?: string;
  rhFactor?: string;
}

export interface DonorPage { items: Donor[]; total: number; }
