import { computed, onMounted, reactive, ref } from "vue";
import { useDonorsStore } from "../stores/donors";
import type { Donor, DonorInput, DonorStatus } from "../types/donors";

export function useDonorsController() {
  const store = useDonorsStore();
  const filters = reactive<{ rndCode: string; status: "" | DonorStatus; page: number }>({
    rndCode: "",
    status: "",
    page: 1
  });
  const pageSize = 20;
  const showForm = ref(false);
  const editing = ref<Donor | null>(null);
  const formError = ref("");
  const form = reactive<DonorInput>({
    rndCode: "",
    originatingIpsName: "",
    clinicalService: "",
    fullName: "",
    documentNumber: "",
    status: "EN_VALORACION",
    bloodGroup: "",
    rhFactor: ""
  });
  const totalPages = computed(() => Math.max(1, Math.ceil(store.page.total / pageSize)));

  async function load() {
    await store.fetch({
      page: filters.page,
      pageSize,
      rndCode: filters.rndCode || undefined,
      status: filters.status || undefined
    });
  }

  function resetForm() {
    Object.assign(form, {
      rndCode: "",
      originatingIpsName: "",
      clinicalService: "",
      fullName: "",
      documentNumber: "",
      status: "EN_VALORACION",
      bloodGroup: "",
      rhFactor: ""
    });
    editing.value = null;
    formError.value = "";
  }

  function openCreate() {
    resetForm();
    showForm.value = true;
  }

  function openEdit(donor: Donor) {
    Object.assign(form, donor);
    editing.value = donor;
    formError.value = "";
    showForm.value = true;
  }

  async function submit() {
    formError.value = "";
    if (
      !form.originatingIpsName ||
      !form.clinicalService ||
      !form.fullName ||
      !form.documentNumber ||
      (!editing.value && !form.rndCode)
    ) {
      formError.value = "Completa todos los campos obligatorios.";
      return;
    }

    const saved = await store.save({ ...form }, editing.value?.id);
    if (!saved) {
      formError.value = store.error;
      return;
    }
    showForm.value = false;
    await load();
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
  }

  onMounted(load);

  return {
    store,
    filters,
    form,
    formError,
    editing,
    showForm,
    totalPages,
    load,
    openCreate,
    openEdit,
    submit,
    formatDate
  };
}
