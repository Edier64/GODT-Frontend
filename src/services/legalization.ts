import { api } from "./api";
import type { EvaluateLegalizationInput, LegalizationResult } from "../types/legalization";

export const legalizationService = {
  async evaluate(donorId: string, input: EvaluateLegalizationInput): Promise<LegalizationResult> {
    const { data } = await api.post<LegalizationResult>(`/donors/${donorId}/legalization`, input);
    return data;
  }
};
