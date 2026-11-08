<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  searchInstitutions,
  createInstitution,
  requestInstitutionAssociation,
  getClinicalServices,
  getProfessionals,
} from "../services/institutions";
import { InstitutionSearchResult } from "../types/institutions";

export interface SelectedEntity {
  id?: string;
  name: string;
  code?: string | null;
  city?: string;
  subtitle?: string;
  hasAccess?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    entityType?: "IPS" | "SERVICE" | "PROFESSIONAL";
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    initialSelected?: SelectedEntity | null;
  }>(),
  {
    entityType: "IPS",
    placeholder: "Buscar o seleccionar...",
    label: "",
    required: false,
    disabled: false,
    initialSelected: null,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "select", entity: SelectedEntity): void;
  (e: "clear"): void;
}>();

const searchTerm = ref("");
const isOpen = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const selectedItem = ref<SelectedEntity | null>(props.initialSelected || null);
const activeIndex = ref(-1);

// Resultados de búsqueda
const institutionResults = ref<InstitutionSearchResult[]>([]);
const stringResults = ref<string[]>([]);
const professionalResults = ref<
  Array<{ id: string; fullName: string; role: string; professionalId: string | null }>
>([]);

// Modal / Formulario integrado de creación rápida
const showCreateModal = ref(false);
const isCreating = ref(false);
const createError = ref("");
const createWarning = ref("");
const needsConfirmation = ref(false);

const newEntityForm = ref({
  name: "",
  code: "",
  city: "Cali",
  department: "Valle del Cauca",
  complexityLevel: "NIVEL_3_ALTA",
});

// Solicitud de asociación a IPS existente
const associationMessage = ref("");
const isRequestingAssociation = ref(false);

let debounceTimer: any = null;

// Inicialización si modelValue ya tiene valor
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      selectedItem.value = null;
      searchTerm.value = "";
    } else if (!selectedItem.value || selectedItem.value.name !== newVal) {
      selectedItem.value = {
        name: newVal,
        hasAccess: true,
      };
    }
  },
  { immediate: true },
);

function handleInput() {
  isOpen.value = true;
  activeIndex.value = -1;
  errorMessage.value = "";
  associationMessage.value = "";

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 250);
}

async function performSearch() {
  const query = searchTerm.value.trim();
  isLoading.value = true;
  errorMessage.value = "";

  try {
    if (props.entityType === "IPS") {
      const res = await searchInstitutions(query);
      institutionResults.value = res.results;
    } else if (props.entityType === "SERVICE") {
      stringResults.value = await getClinicalServices(query);
    } else if (props.entityType === "PROFESSIONAL") {
      professionalResults.value = await getProfessionals(query);
    }
  } catch (err: any) {
    errorMessage.value = "Error al consultar registros.";
  } finally {
    isLoading.value = false;
  }
}

function selectItem(item: SelectedEntity) {
  selectedItem.value = item;
  searchTerm.value = "";
  isOpen.value = false;
  emit("update:modelValue", item.name);
  emit("select", item);
}

function clearSelection() {
  selectedItem.value = null;
  searchTerm.value = "";
  isOpen.value = false;
  emit("update:modelValue", "");
  emit("clear");
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      isOpen.value = true;
      performSearch();
    }
    return;
  }

  const total =
    props.entityType === "IPS"
      ? institutionResults.value.length
      : props.entityType === "SERVICE"
      ? stringResults.value.length
      : professionalResults.value.length;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % total;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + total) % total;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex.value >= 0 && activeIndex.value < total) {
      if (props.entityType === "IPS") {
        const inst = institutionResults.value[activeIndex.value];
        selectItem({
          id: inst.id,
          name: inst.name,
          code: inst.code,
          city: inst.city,
          subtitle: `${inst.city || "Cali"}${inst.code ? " · " + inst.code : ""}`,
          hasAccess: inst.hasUserAccess,
        });
      } else if (props.entityType === "SERVICE") {
        selectItem({ name: stringResults.value[activeIndex.value] });
      } else if (props.entityType === "PROFESSIONAL") {
        const prof = professionalResults.value[activeIndex.value];
        selectItem({
          id: prof.id,
          name: prof.fullName,
          subtitle: `${prof.role}${prof.professionalId ? " · RM: " + prof.professionalId : ""}`,
        });
      }
    } else if (searchTerm.value.trim() && props.entityType === "SERVICE") {
      // Para servicios clínicos se permite seleccionar el texto libre si no existe
      selectItem({ name: searchTerm.value.trim() });
    }
  } else if (e.key === "Escape") {
    isOpen.value = false;
  }
}

// Abrir formulario integrado de creación de IPS
function openCreateModal() {
  newEntityForm.value.name = searchTerm.value.trim();
  newEntityForm.value.code = "";
  newEntityForm.value.city = "Cali";
  newEntityForm.value.department = "Valle del Cauca";
  newEntityForm.value.complexityLevel = "NIVEL_3_ALTA";
  createError.value = "";
  createWarning.value = "";
  needsConfirmation.value = false;
  showCreateModal.value = true;
  isOpen.value = false;
}

// Guardar nueva IPS
async function submitCreateEntity() {
  if (!newEntityForm.value.name.trim()) {
    createError.value = "El nombre de la institución es obligatorio.";
    return;
  }

  isCreating.value = true;
  createError.value = "";

  try {
    const created = await createInstitution({
      name: newEntityForm.value.name.trim(),
      code: newEntityForm.value.code.trim() || undefined,
      city: newEntityForm.value.city.trim() || "Cali",
      department: newEntityForm.value.department.trim() || "Valle del Cauca",
      complexityLevel: newEntityForm.value.complexityLevel,
      confirmNonDuplicate: needsConfirmation.value,
    });

    showCreateModal.value = false;
    selectItem({
      id: created.id,
      name: created.name,
      code: created.code,
      city: created.city,
      subtitle: `${created.city} · ${created.code || "Registrada"}`,
      hasAccess: true,
    });
  } catch (err: any) {
    const resp = err.response?.data;
    if (err.response?.status === 409 && resp?.requiresConfirmation) {
      createWarning.value = resp.message;
      needsConfirmation.value = true;
    } else {
      createError.value =
        resp?.message || "No se pudo registrar la institución. Verifique permisos.";
    }
  } finally {
    isCreating.value = false;
  }
}

// Solicitar asociación institucional
async function handleRequestAssociation(inst: InstitutionSearchResult) {
  isRequestingAssociation.value = true;
  associationMessage.value = "";
  try {
    const res = await requestInstitutionAssociation(inst.id);
    associationMessage.value = res.message;
    inst.hasUserAccess = true; // Habilitar selección inmediata tras aprobación
  } catch (err: any) {
    associationMessage.value =
      err.response?.data?.message || "Error al solicitar asociación.";
  } finally {
    isRequestingAssociation.value = false;
  }
}

// Click outside para cerrar el menú flotante
function handleClickOutside(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.closest(".autocomplete-container")) {
    isOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="autocomplete-container relative w-full">
    <label v-if="label" class="block text-xs font-semibold text-slate-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-rose-500 font-bold">*</span>
    </label>

    <!-- Estado: Entidad ya seleccionada (Badge / Chip identificada) -->
    <div
      v-if="selectedItem"
      class="flex items-center justify-between p-2.5 px-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition"
      :class="{ 'opacity-60 cursor-not-allowed': disabled }"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          :class="
            entityType === 'IPS'
              ? 'bg-[#123047]/10 text-[#123047]'
              : entityType === 'SERVICE'
              ? 'bg-[#159c9a]/15 text-[#159c9a]'
              : 'bg-indigo-50 text-indigo-700'
          "
        >
          <span v-if="entityType === 'IPS'">🏥</span>
          <span v-else-if="entityType === 'SERVICE'">🩺</span>
          <span v-else>👨‍⚕️</span>
        </div>
        <div class="truncate">
          <p class="text-xs font-bold text-slate-800 truncate">
            {{ selectedItem.name }}
          </p>
          <p
            v-if="selectedItem.subtitle || selectedItem.city"
            class="text-[10px] text-slate-500 truncate"
          >
            {{ selectedItem.subtitle || selectedItem.city }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 ml-2">
        <span
          v-if="entityType === 'IPS' && selectedItem.hasAccess !== false"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          Autorizada
        </span>
        <button
          v-if="!disabled"
          type="button"
          class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="Limpiar selección y buscar otra entidad"
          @click="clearSelection"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Estado: Búsqueda activa / Sin selección previa -->
    <div v-else class="relative">
      <div class="relative flex items-center">
        <input
          v-model="searchTerm"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          class="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123047]/20 focus:border-[#123047] transition pr-9"
          @input="handleInput"
          @focus="isOpen = true; performSearch();"
          @keydown="handleKeyDown"
        />
        <div class="absolute right-3 pointer-events-none text-slate-400">
          <svg
            v-if="isLoading"
            class="animate-spin h-4 w-4 text-[#159c9a]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span v-else class="text-xs">🔍</span>
        </div>
      </div>

      <!-- Menú flotante de resultados -->
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100"
      >
        <!-- Tipo: IPS -->
        <template v-if="entityType === 'IPS'">
          <div
            v-for="(inst, idx) in institutionResults"
            :key="inst.id"
            class="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
            :class="{ 'bg-slate-50': activeIndex === idx }"
            @click="
              inst.hasUserAccess
                ? selectItem({
                    id: inst.id,
                    name: inst.name,
                    code: inst.code,
                    city: inst.city,
                    subtitle: `${inst.city || 'Cali'}${inst.code ? ' · ' + inst.code : ''}`,
                    hasAccess: true,
                  })
                : null
            "
          >
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-800">{{ inst.name }}</span>
                <span
                  v-if="inst.matchType === 'ALIAS' && inst.matchedAlias"
                  class="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] rounded-md font-medium"
                >
                  alias: {{ inst.matchedAlias }}
                </span>
                <span
                  v-if="inst.matchType === 'APPROXIMATE'"
                  class="px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[9px] rounded-md font-medium border border-amber-200"
                >
                  Sugerencia aproximada
                </span>
              </div>
              <p class="text-[10px] text-slate-500 mt-0.5">
                {{ inst.city || "Cali" }} · {{ inst.complexityLevel || "Nivel III" }}
                <span v-if="inst.code">· Código: {{ inst.code }}</span>
              </p>
              <p
                v-if="inst.matchType === 'APPROXIMATE' && inst.suggestionMessage"
                class="text-[10px] text-amber-800 font-medium mt-1 bg-amber-50/60 p-1 rounded-md"
              >
                {{ inst.suggestionMessage }}
              </p>
            </div>

            <div class="shrink-0 flex items-center gap-1">
              <span
                v-if="inst.hasUserAccess"
                class="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md"
              >
                Seleccionar
              </span>
              <div v-else class="text-right">
                <p class="text-[10px] text-rose-600 font-semibold mb-1">
                  Sin autorización
                </p>
                <button
                  type="button"
                  class="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                  :disabled="isRequestingAssociation"
                  @click.stop="handleRequestAssociation(inst)"
                >
                  {{ isRequestingAssociation ? "Solicitando..." : "Solicitar acceso" }}
                </button>
              </div>
            </div>
          </div>

          <!-- Estado vacío para IPS con botón de creación -->
          <div
            v-if="!isLoading && institutionResults.length === 0"
            class="p-4 text-center text-xs"
          >
            <p class="text-slate-500">
              No encontramos ninguna IPS con el nombre "<span class="font-semibold text-slate-700">{{ searchTerm }}</span>".
            </p>
            <button
              type="button"
              class="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#123047] hover:bg-[#1e5575] rounded-xl shadow-xs transition cursor-pointer"
              @click="openCreateModal"
            >
              <span>+ Registrar nueva IPS</span>
            </button>
          </div>
        </template>

        <!-- Tipo: Servicio Clínico -->
        <template v-else-if="entityType === 'SERVICE'">
          <div
            v-for="(service, idx) in stringResults"
            :key="service"
            class="p-2.5 px-3 hover:bg-slate-50 transition cursor-pointer text-xs font-semibold text-slate-800"
            :class="{ 'bg-slate-50': activeIndex === idx }"
            @click="selectItem({ name: service })"
          >
            🩺 {{ service }}
          </div>
          <div
            v-if="!isLoading && stringResults.length === 0"
            class="p-3 text-xs text-slate-500 flex items-center justify-between"
          >
            <span>No hay coincidencias exactas.</span>
            <button
              type="button"
              class="text-indigo-600 font-bold hover:underline"
              @click="selectItem({ name: searchTerm.trim() })"
            >
              Usar "{{ searchTerm.trim() }}"
            </button>
          </div>
        </template>

        <!-- Tipo: Profesional -->
        <template v-else-if="entityType === 'PROFESSIONAL'">
          <div
            v-for="(prof, idx) in professionalResults"
            :key="prof.id"
            class="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-xs"
            :class="{ 'bg-slate-50': activeIndex === idx }"
            @click="
              selectItem({
                id: prof.id,
                name: prof.fullName,
                subtitle: `${prof.role}${prof.professionalId ? ' · RM: ' + prof.professionalId : ''}`,
              })
            "
          >
            <div>
              <p class="font-bold text-slate-800">{{ prof.fullName }}</p>
              <p class="text-[10px] text-slate-500">
                Rol: {{ prof.role }} · RM: {{ prof.professionalId || "N/A" }}
              </p>
            </div>
            <span class="text-indigo-600 font-bold text-[10px]">Seleccionar</span>
          </div>
          <div
            v-if="!isLoading && professionalResults.length === 0"
            class="p-3 text-center text-xs text-slate-500"
          >
            No se encontraron profesionales con ese criterio.
          </div>
        </template>
      </div>
    </div>

    <!-- Mensaje de solicitud de asociación -->
    <p v-if="associationMessage" class="mt-1 text-[11px] text-indigo-700 font-medium">
      ℹ️ {{ associationMessage }}
    </p>

    <!-- Modal Integrado de Creación Rápida de IPS -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>🏥</span>
            <h3 class="text-sm font-bold text-slate-800">
              Registrar Nueva Institución (IPS)
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            @click="showCreateModal = false"
          >
            ✕
          </button>
        </div>

        <form class="p-5 space-y-3.5 text-xs" @submit.prevent="submitCreateEntity">
          <div v-if="createError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {{ createError }}
          </div>

          <div v-if="createWarning" class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5">
            <p class="font-bold">⚠️ Posible duplicado detectado:</p>
            <p>{{ createWarning }}</p>
            <p class="text-[11px]">Si confirmas que es una sede o entidad diferente, puedes hacer clic en <strong>Confirmar y Crear</strong>.</p>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nombre Institucional Canónico *</label>
            <input
              v-model="newEntityForm.name"
              type="text"
              required
              class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              placeholder="Ej. Clínica Nueva Esperanza"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Código / NIT REPS</label>
              <input
                v-model="newEntityForm.code"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                placeholder="Ej. CNE-76001"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nivel / Complejidad</label>
              <select
                v-model="newEntityForm.complexityLevel"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                <option value="NIVEL_3_ALTA">Alta Complejidad (Nivel III)</option>
                <option value="NIVEL_2_MEDIA">Mediana Complejidad (Nivel II)</option>
                <option value="NIVEL_1_BAJA">Baja Complejidad (Nivel I)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Ciudad *</label>
              <input
                v-model="newEntityForm.city"
                type="text"
                required
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Departamento</label>
              <input
                v-model="newEntityForm.department"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              class="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              :disabled="isCreating"
              @click="showCreateModal = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-xs font-bold text-white bg-[#123047] hover:bg-[#1e5575] rounded-xl transition cursor-pointer disabled:opacity-50"
              :disabled="isCreating"
            >
              {{
                isCreating
                  ? "Guardando..."
                  : needsConfirmation
                  ? "Confirmar y Crear"
                  : "Guardar y Seleccionar"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

