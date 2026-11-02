import { api } from "./api";
import type { Donor, DonorInput, DonorPage, DonorStatus } from "../types/donors";

export interface DonorFilters {
  page: number;
  pageSize: number;
  rndCode?: string;
  status?: DonorStatus;
}

type CreateDonorInput = Required<Pick<DonorInput, "rndCode">> & Omit<DonorInput, "rndCode">;

export const donorsService = {
  async list(filters: DonorFilters): Promise<DonorPage> {
    const { data } = await api.get<DonorPage>("/donors", { params: filters });
    return data;
  },
  async create(input: CreateDonorInput): Promise<Donor> {
    const { data } = await api.post<Donor>("/donors", input);
    return data;
  },
  async update(id: string, input: DonorInput): Promise<Donor> {
    const { data } = await api.patch<Donor>(`/donors/${id}`, input);
    return data;
  }
};
