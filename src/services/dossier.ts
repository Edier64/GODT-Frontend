import { api } from "./api";
import type {
  DossierManifest,
  IntegrityVerificationReport,
  ProcessDossierExport,
  RequestDossierExportPayload,
} from "../types/dossier";

export const dossierService = {
  /**
   * Solicita una nueva exportación de expediente (ZIP, PDF Consolidado o solo índice).
   */
  async requestExport(
    processId: string,
    payload: RequestDossierExportPayload = {},
  ): Promise<ProcessDossierExport> {
    const { data } = await api.post<ProcessDossierExport>(
      `/donation-processes/${processId}/dossier/exports`,
      payload,
    );
    return data;
  },

  /**
   * Obtiene la lista histórica de exportaciones para el proceso.
   */
  async listExports(processId: string): Promise<ProcessDossierExport[]> {
    const { data } = await api.get<ProcessDossierExport[]>(
      `/donation-processes/${processId}/dossier/exports`,
    );
    return data;
  },

  /**
   * Obtiene el estado y detalle de una exportación específica (útil para polling).
   */
  async getExport(processId: string, exportId: string): Promise<ProcessDossierExport> {
    const { data } = await api.get<ProcessDossierExport>(
      `/donation-processes/${processId}/dossier/exports/${exportId}`,
    );
    return data;
  },

  /**
   * Descarga el paquete ZIP completo del expediente.
   */
  async downloadZip(processId: string, exportId: string): Promise<Blob> {
    const response = await api.get(
      `/donation-processes/${processId}/dossier/exports/${exportId}/download`,
      { responseType: "blob" },
    );
    return response.data;
  },

  /**
   * Descarga el PDF consolidado continuo del expediente.
   */
  async downloadConsolidatedPdf(processId: string, exportId: string): Promise<Blob> {
    const response = await api.get(
      `/donation-processes/${processId}/dossier/exports/${exportId}/consolidated-pdf`,
      { responseType: "blob" },
    );
    return response.data;
  },

  /**
   * Obtiene el manifiesto de integridad en formato JSON.
   */
  async getManifest(processId: string, exportId: string): Promise<DossierManifest> {
    const { data } = await api.get<DossierManifest>(
      `/donation-processes/${processId}/dossier/exports/${exportId}/manifest`,
    );
    return data;
  },

  /**
   * Ejecuta la verificación criptográfica SHA-256 de todos los componentes contra el manifiesto.
   */
  async verifyIntegrity(
    processId: string,
    exportId: string,
  ): Promise<IntegrityVerificationReport> {
    const { data } = await api.post<IntegrityVerificationReport>(
      `/donation-processes/${processId}/dossier/exports/${exportId}/verify`,
    );
    return data;
  },
};
