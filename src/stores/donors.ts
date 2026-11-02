import { ref } from "vue";
import { defineStore } from "pinia";
import { donorsService, type DonorFilters } from "../services/donors";
import { getApiError } from "../services/api";
import type { Donor, DonorInput, DonorPage } from "../types/donors";

type CreateDonorInput = Required<Pick<DonorInput, "rndCode">> & Omit<DonorInput, "rndCode">;

export const useDonorsStore = defineStore("donors", () => {
  const page = ref<DonorPage>({ items: [], total: 0 });
  const loading = ref(false);
  const error = ref("");

  async function fetch(filters: DonorFilters) {
    loading.value = true;
    error.value = "";
    try { page.value = await donorsService.list(filters); }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }

  async function save(input: DonorInput, id?: string): Promise<Donor | null> {
    loading.value = true;
    error.value = "";
    try {
      return id ? await donorsService.update(id, input) : await donorsService.create(input as CreateDonorInput);
    } catch (reason) {
      error.value = getApiError(reason);
      return null;
    } finally { loading.value = false; }
  }

  return { page, loading, error, fetch, save };
});
