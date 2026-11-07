import { api } from "./api";
import type {
  OcrField,
  OcrJob,
  OcrJobFieldsResponse,
  ValidateOcrFieldInput
} from "../types/ocr";

export const ocrService = {
  async start(documentId: string): Promise<OcrJob> {
    const { data } = await api.post<OcrJob>(`/documents/${documentId}/ocr`);
    return data;
  },
  async getJob(jobId: string): Promise<OcrJobFieldsResponse> {
    const { data } = await api.get<OcrJobFieldsResponse>(`/ocr/jobs/${jobId}`);
    return data;
  },
  async fields(jobId: string): Promise<OcrField[]> {
    const { data } = await api.get<OcrField[]>(`/ocr/jobs/${jobId}/fields`);
    return data;
  },
  async validate(fieldId: string, input: ValidateOcrFieldInput): Promise<OcrField> {
    const { data } = await api.patch<OcrField>(`/ocr/fields/${fieldId}/validation`, input);
    return data;
  },
  async propagate(donorId: string, fieldId: string): Promise<OcrField> {
    const { data } = await api.post<OcrField>(`/donors/${donorId}/clinical-data/propagate`, { fieldId });
    return data;
  },
  async propagateToProcess(processId: string, fieldId: string): Promise<OcrField> {
    const { data } = await api.post<OcrField>(`/processes/${processId}/ocr/propagate`, { fieldId });
    return data;
  }
};
