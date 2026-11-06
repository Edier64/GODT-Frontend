import { ref } from "vue";
import type {
  AddProcessInstitutionPayload,
  AddProcessParticipantPayload,
  CreateDonationProcessPayload,
  DependencyEvaluationResult,
  DonationProcess,
  DonationProcessStatus,
  ProcessDocument,
  ProcessDocumentsSummary,
  UpdateDocumentApplicabilityPayload,
} from "../types/donation-process";
import {
  addProcessInstitution,
  addProcessParticipant,
  createDonationProcess,
  evaluateDocumentDependencies,
  getDonationProcess,
  getProcessDocuments,
  initiateProcessDocument,
  listDonationProcesses,
  updateDocumentApplicability,
  updateDonationProcess,
} from "../services/donationProcess";
import { getApiError } from "../services/api";

export function useDonationProcessController() {
  const processes = ref<DonationProcess[]>([]);
  const currentProcess = ref<DonationProcess | null>(null);
  const documentsSummary = ref<ProcessDocumentsSummary | null>(null);
  const loading = ref(false);
  const loadingDocuments = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const page = ref(1);

  async function loadProcesses(query?: {
    status?: string;
    donorId?: string;
    primaryIpsName?: string;
    page?: number;
    pageSize?: number;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const data = await listDonationProcesses(query);
      processes.value = data.items;
      total.value = data.total;
      page.value = data.page;
    } catch (err) {
      error.value = getApiError(err);
    } finally {
      loading.value = false;
    }
  }

  async function loadProcess(id: string) {
    loading.value = true;
    error.value = null;
    try {
      currentProcess.value = await getDonationProcess(id);
    } catch (err) {
      error.value = getApiError(err);
    } finally {
      loading.value = false;
    }
  }

  async function loadDocuments(processId: string) {
    loadingDocuments.value = true;
    error.value = null;
    try {
      documentsSummary.value = await getProcessDocuments(processId);
    } catch (err) {
      error.value = getApiError(err);
    } finally {
      loadingDocuments.value = false;
    }
  }

  async function changeApplicability(
    processId: string,
    documentId: string,
    payload: UpdateDocumentApplicabilityPayload,
  ): Promise<ProcessDocument | null> {
    error.value = null;
    try {
      const updated = await updateDocumentApplicability(processId, documentId, payload);
      if (documentsSummary.value) {
        const idx = documentsSummary.value.documents.findIndex((d) => d.id === documentId);
        if (idx !== -1) {
          documentsSummary.value.documents[idx] = updated;
          // Refresh full summary for recalculated counters
          await loadDocuments(processId);
        }
      }
      return updated;
    } catch (err) {
      error.value = getApiError(err);
      return null;
    }
  }

  async function initiateDocument(
    processId: string,
    documentId: string,
  ): Promise<{ document: ProcessDocument; instanceId: string } | null> {
    error.value = null;
    try {
      const res = await initiateProcessDocument(processId, documentId);
      if (documentsSummary.value) {
        const idx = documentsSummary.value.documents.findIndex((d) => d.id === documentId);
        if (idx !== -1) {
          documentsSummary.value.documents[idx] = res.document;
        }
      }
      return res;
    } catch (err) {
      error.value = getApiError(err);
      return null;
    }
  }

  async function checkDependencies(
    processId: string,
    documentId: string,
  ): Promise<DependencyEvaluationResult | null> {
    error.value = null;
    try {
      return await evaluateDocumentDependencies(processId, documentId);
    } catch (err) {
      error.value = getApiError(err);
      return null;
    }
  }

  async function openProcess(payload: CreateDonationProcessPayload): Promise<DonationProcess | null> {
    loading.value = true;
    error.value = null;
    try {
      const created = await createDonationProcess(payload);
      processes.value.unshift(created);
      return created;
    } catch (err) {
      error.value = getApiError(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function changeStatus(
    id: string,
    status: DonationProcessStatus,
    notes?: string,
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const updated = await updateDonationProcess(id, { status, notes });
      if (currentProcess.value && currentProcess.value.id === id) {
        currentProcess.value = updated;
      }
      const idx = processes.value.findIndex((p) => p.id === id);
      if (idx !== -1) {
        processes.value[idx] = updated;
      }
      return true;
    } catch (err) {
      error.value = getApiError(err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function attachInstitution(
    processId: string,
    payload: AddProcessInstitutionPayload,
  ): Promise<boolean> {
    error.value = null;
    try {
      const inst = await addProcessInstitution(processId, payload);
      if (currentProcess.value && currentProcess.value.id === processId) {
        if (!currentProcess.value.institutions) {
          currentProcess.value.institutions = [];
        }
        currentProcess.value.institutions.push(inst);
      }
      return true;
    } catch (err) {
      error.value = getApiError(err);
      return false;
    }
  }

  async function attachParticipant(
    processId: string,
    payload: AddProcessParticipantPayload,
  ): Promise<boolean> {
    error.value = null;
    try {
      const part = await addProcessParticipant(processId, payload);
      if (currentProcess.value && currentProcess.value.id === processId) {
        if (!currentProcess.value.participants) {
          currentProcess.value.participants = [];
        }
        currentProcess.value.participants.push(part);
      }
      return true;
    } catch (err) {
      error.value = getApiError(err);
      return false;
    }
  }

  return {
    processes,
    currentProcess,
    documentsSummary,
    loading,
    loadingDocuments,
    error,
    total,
    page,
    loadProcesses,
    loadProcess,
    loadDocuments,
    changeApplicability,
    initiateDocument,
    checkDependencies,
    openProcess,
    changeStatus,
    attachInstitution,
    attachParticipant,
  };
}


