import { computed, reactive, ref } from "vue";
import { getApiError } from "../services/api";
import { legalizationService } from "../services/legalization";
import type { EvaluateLegalizationInput, LegalizationMechanism, LegalizationResult } from "../types/legalization";

export function useLegalizationController(donorId: string) {
  const form = reactive<EvaluateLegalizationInput>({
    mechanism: "PRESUNCION_LEGAL",
    isAdult: true,
    isColombian: true,
    isResident: true,
    oppositionRegistered: false,
    representatives: []
  });
  const loading = ref(false);
  const error = ref("");
  const result = ref<LegalizationResult | null>(null);
  const localError = ref("");

  const representativeRequired = computed(() => form.mechanism === "CONSENTIMIENTO_FAMILIAR");

  function setMechanism(mechanism: LegalizationMechanism) {
    form.mechanism = mechanism;
    if (mechanism === "PRESUNCION_LEGAL") form.representatives = [];
  }

  function addRepresentative() {
    form.representatives.push({
      fullName: "",
      documentType: "",
      documentNumber: "",
      relationshipToDonor: ""
    });
  }

  function removeRepresentative(index: number) {
    form.representatives.splice(index, 1);
  }

  function validate(): boolean {
    localError.value = "";
    if (representativeRequired.value && form.representatives.length < 2) {
      localError.value = "El backend exige al menos dos representantes para el consentimiento familiar.";
      return false;
    }
    if (form.representatives.some((representative) =>
      !representative.fullName.trim() ||
      !representative.documentType.trim() ||
      !representative.documentNumber.trim() ||
      !representative.relationshipToDonor.trim()
    )) {
      localError.value = "Completa todos los datos obligatorios de los representantes.";
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validate() || loading.value) return;
    loading.value = true;
    error.value = "";
    result.value = null;
    try { result.value = await legalizationService.evaluate(donorId, { ...form, representatives: form.representatives.map((representative) => ({ ...representative })) }); }
    catch (reason) { error.value = getApiError(reason); }
    finally { loading.value = false; }
  }

  return {
    form, loading, error, localError, result, representativeRequired,
    setMechanism, addRepresentative, removeRepresentative, submit
  };
}
