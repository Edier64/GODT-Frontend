<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { documentLifecycleService } from "../services/documentLifecycle";
import type {
  DocumentParticipant,
  GeneratedPdfDocument,
  SignatureType,
} from "../types/document-lifecycle";

const props = defineProps<{
  instanceId: string;
  snapshot: GeneratedPdfDocument;
  participants: DocumentParticipant[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "signed"): void;
}>();

const signing = ref(false);
const error = ref<string | null>(null);

const form = reactive({
  participantId: "",
  signatureType: "ATESTACION_USUARIO" as SignatureType,
  signerName: "",
  signerRole: "CIRUJANO_RESCATE",
  signerDocumentType: "CC",
  signerDocumentNumber: "",
  signerProfessionalId: "",
  signatureData: "",
  attestationText:
    "Atestiguo bajo juramento y responsabilidad profesional que he revisado el contenido de este documento y confirmo la veracidad de la información clínica registrada en el proceso de donación.",
  acceptAttestation: true,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const hasDrawn = ref(false);

// Cuando se selecciona un participante del selector, autocompletar
watch(
  () => form.participantId,
  (val) => {
    if (!val) return;
    const part = props.participants.find((p) => p.id === val);
    if (part) {
      form.signerName = part.fullName;
      form.signerRole = part.role;
      form.signerDocumentType = part.documentType;
      form.signerDocumentNumber = part.documentNumber;
      form.signerProfessionalId = part.professionalId || "";
    }
  },
);

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "#0d2033";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function clearCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  form.signatureData = "";
  hasDrawn.value = false;
}

function startDrawing(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  isDrawing.value = true;
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
  hasDrawn.value = true;
}

function stopDrawing() {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  const canvas = canvasRef.value;
  if (canvas && hasDrawn.value) {
    form.signatureData = canvas.toDataURL("image/png");
  }
}

watch(
  () => form.signatureType,
  async (newType) => {
    if (newType === "DIBUJADA_UI") {
      await nextTick();
      initCanvas();
    }
  },
);

// Validación reactiva de formulario (UI-06)
const isAttestationLengthValid = computed(
  () => form.attestationText.trim().length >= 10,
);

const validationFeedback = computed<string | null>(() => {
  if (!form.signerName.trim()) return "Ingrese el nombre completo del firmante.";
  if (!form.signerDocumentNumber.trim()) return "Ingrese el número de documento.";
  if (form.signatureType === "DIGITAL_CERTIFICADA") {
    return "Firma digital certificada bloqueada (requiere ONAC Ley 527/1999).";
  }
  if (form.signatureType === "ATESTACION_USUARIO") {
    if (!form.acceptAttestation) {
      return "Debe marcar la casilla de aceptación de la atestación.";
    }
    if (!isAttestationLengthValid.value) {
      return `La atestación debe tener al menos 10 caracteres (actual: ${form.attestationText.trim().length}).`;
    }
  }
  if (form.signatureType === "DIBUJADA_UI" && !hasDrawn.value && !form.signatureData) {
    return "Dibuje su firma en el recuadro interactivo.";
  }
  return null;
});

const isFormValid = computed(() => validationFeedback.value === null);

async function handleSubmit() {
  if (!isFormValid.value) {
    error.value = validationFeedback.value || "Complete los campos obligatorios.";
    return;
  }

  signing.value = true;
  error.value = null;

  try {
    await documentLifecycleService.signSnapshot(props.instanceId, props.snapshot.id, {
      participantId: form.participantId || undefined,
      signatureType: form.signatureType,
      signatureData: form.signatureData || undefined,
      attestationText:
        form.signatureType === "ATESTACION_USUARIO"
          ? form.attestationText.trim()
          : undefined,
      signerName: form.signerName.trim(),
      signerRole: form.signerRole.trim(),
      signerDocumentType: form.signerDocumentType,
      signerDocumentNumber: form.signerDocumentNumber.trim(),
      signerProfessionalId: form.signerProfessionalId?.trim() || undefined,
    });

    emit("signed");
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || err?.message || "Error al estampar la firma.";
  } finally {
    signing.value = false;
  }
}

onMounted(() => {
  // Autoseleccionar primer participante que requiera firma si existe
  const pendingParticipant = props.participants.find((p) => p.requiresSignature);
  if (pendingParticipant) {
    form.participantId = pendingParticipant.id;
  }
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 text-xl font-bold"
          >
            ✍️
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">
              Estampar Firma en Documento
            </h3>
            <p class="text-xs text-slate-500 font-mono">
              Snapshot v{{ snapshot.versionNumber }} · Hash: {{ snapshot.sha256Hash?.slice(0, 16) }}...
            </p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Formulario -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div
          class="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs text-teal-900"
        >
          <strong class="font-bold">Atestación Criptográfica Inalterable:</strong>
          <p class="mt-0.5">
            La firma se vinculará criptográficamente al hash SHA-256 de este documento. Si los datos clínicos cambian y se genera una nueva versión, este snapshot preservará sus firmas vigentes de manera inmutable.
          </p>
        </div>

        <div v-if="error" class="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          {{ error }}
        </div>

        <!-- Selección de participante o carga manual -->
        <div v-if="participants.length > 0">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Asociar a Participante Asignado (Opcional):
          </label>
          <select
            v-model="form.participantId"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          >
            <option value="">-- Ingreso Manual / Usuario en Sesión --</option>
            <option v-for="p in participants" :key="p.id" :value="p.id">
              {{ p.fullName }} ({{ p.role }}) {{ p.requiresSignature ? '· Firma Requerida' : '' }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo del Firmante *
            </label>
            <input
              v-model="form.signerName"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              placeholder="Ej: Dr. Carlos Pérez"
              required
            />
          </div>

          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Rol Clínico / Funcional *
            </label>
            <input
              v-model="form.signerRole"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              placeholder="Ej: CIRUJANO_RESCATE"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Tipo Documento *
            </label>
            <select
              v-model="form.signerDocumentType"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              <option value="CC">Cédula de Ciudadanía (CC)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
              <option value="PA">Pasaporte (PA)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Número de Documento *
            </label>
            <input
              v-model="form.signerDocumentNumber"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              placeholder="12345678"
              required
            />
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Registro Médico / Tarjeta Profesional (si aplica)
            </label>
            <input
              v-model="form.signerProfessionalId"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              placeholder="Ej: RM-058921"
            />
          </div>
        </div>

        <!-- Modalidad de Firma (UI-06: Estilo diferenciado) -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2">
            Modalidad de Firma *
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <!-- Atestación de Usuario -->
            <label
              class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors"
              :class="
                form.signatureType === 'ATESTACION_USUARIO'
                  ? 'border-teal-600 bg-teal-50/70 font-semibold text-teal-950 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="ATESTACION_USUARIO"
                class="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span class="block font-bold">📜 Atestación de Usuario</span>
                <span class="block text-[11px] font-normal text-slate-500 mt-0.5">
                  Declaración juramentada vinculada al login institucional.
                </span>
              </div>
            </label>

            <!-- Firma Dibujada en Pantalla -->
            <label
              class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors"
              :class="
                form.signatureType === 'DIBUJADA_UI'
                  ? 'border-teal-600 bg-teal-50/70 font-semibold text-teal-950 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="DIBUJADA_UI"
                class="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span class="block font-bold">✒️ Firma Dibujada en Pantalla</span>
                <span class="block text-[11px] font-normal text-slate-500 mt-0.5">
                  Trazo manuscrito capturado en recuadro táctil o ratón.
                </span>
              </div>
            </label>

            <!-- Manuscrita Presencial -->
            <label
              class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors"
              :class="
                form.signatureType === 'MANUSCRITA_PRESENCIAL'
                  ? 'border-teal-600 bg-teal-50/70 font-semibold text-teal-950 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="MANUSCRITA_PRESENCIAL"
                class="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span class="block font-bold">📝 Manuscrita Presencial</span>
                <span class="block text-[11px] font-normal text-slate-500 mt-0.5">
                  Constancia de rúbrica en formato físico de soporte.
                </span>
              </div>
            </label>

            <!-- Digital Certificada (Bloqueada con estilo diferenciado) -->
            <div
              class="flex cursor-not-allowed items-start justify-between rounded-xl border border-dashed border-slate-300 bg-slate-100/80 p-3 opacity-80"
              title="No habilitada operativamente. Requiere integración PKI con entidad de certificación acreditada por la ONAC (Ley 527/1999)"
            >
              <div class="flex items-start gap-2.5">
                <input
                  type="radio"
                  disabled
                  class="mt-0.5 text-slate-400 cursor-not-allowed"
                />
                <div>
                  <span class="block font-medium text-slate-500 line-through">🔏 Digital Certificada</span>
                  <span class="block text-[10px] text-slate-400 mt-0.5">
                    No habilitada operativamente.
                  </span>
                </div>
              </div>
              <span class="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 shrink-0">
                Requiere ONAC
              </span>
            </div>
          </div>
        </div>

        <!-- Declaración y Atestación Bajo Juramento (para ATESTACION_USUARIO) -->
        <div
          v-if="form.signatureType === 'ATESTACION_USUARIO'"
          class="rounded-xl border border-teal-200 bg-teal-50/70 p-4 space-y-3 text-xs"
        >
          <div class="flex items-start gap-2.5">
            <input
              id="attestCheckbox"
              v-model="form.acceptAttestation"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-teal-400 text-teal-700 focus:ring-teal-500 cursor-pointer"
            />
            <label for="attestCheckbox" class="text-slate-800 font-medium leading-relaxed cursor-pointer">
              <strong>Aceptación bajo juramento:</strong> Atestiguo y confirmo la veracidad de la información clínica registrada en el proceso de donación.
            </label>
          </div>

          <!-- Campo de texto de justificación o texto de atestación editable (UI-06) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block font-semibold text-slate-700">
                Texto de Atestación Legal / Justificación Clínica *
              </label>
              <span
                class="font-mono text-[11px] font-semibold"
                :class="isAttestationLengthValid ? 'text-teal-700' : 'text-rose-600'"
              >
                {{ form.attestationText.trim().length }}/10 caracteres mín.
              </span>
            </div>
            <textarea
              v-model="form.attestationText"
              rows="3"
              class="w-full rounded-lg border bg-white p-2.5 text-xs text-slate-800 focus:outline-hidden"
              :class="
                isAttestationLengthValid
                  ? 'border-teal-300 focus:ring-2 focus:ring-teal-500'
                  : 'border-rose-300 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
              "
              placeholder="Ingrese el texto formal de atestación..."
            ></textarea>
            <p v-if="!isAttestationLengthValid" class="text-[11px] text-rose-600 mt-1 font-medium">
              ⚠️ La atestación debe tener al menos 10 caracteres para cumplir con la auditoría documental.
            </p>
          </div>

          <p class="text-[10px] text-teal-800 italic">
            ⚖️ Aviso legal: Esta atestación electrónica vincula su usuario en sesión al documento inmutable conforme a la política GODT Regional 3. No constituye firma digital PKI (Ley 527 de 1999).
          </p>
        </div>

        <!-- Canvas interactivo para firma dibujada -->
        <div v-show="form.signatureType === 'DIBUJADA_UI'" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-700">Dibujar firma manuscrita:</span>
            <button
              type="button"
              class="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              @click="clearCanvas"
            >
              Limpiar recuadro
            </button>
          </div>
          <div class="rounded-xl border border-slate-300 bg-white p-1 shadow-inner">
            <canvas
              ref="canvasRef"
              width="480"
              height="150"
              class="h-[150px] w-full cursor-crosshair rounded-lg bg-slate-50 touch-none"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
            />
          </div>
          <p v-if="!hasDrawn && !form.signatureData" class="text-[11px] text-amber-700 font-medium">
            ✏️ Utilice el ratón o lápiz táctil para dibujar su rúbrica en el área blanca.
          </p>
          <p v-else class="text-[11px] text-emerald-700 font-medium">
            ✓ Trazo de firma registrado correctamente.
          </p>
        </div>
      </div>

      <!-- Footer con validación reactiva (UI-06) -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
        <div class="text-[11px] text-slate-500">
          <span v-if="!isFormValid" class="text-amber-800 font-medium">
            ℹ️ {{ validationFeedback }}
          </span>
          <span v-else class="text-emerald-700 font-medium">
            ✓ Formulario validado. Listo para estampar.
          </span>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
            :disabled="signing"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-[#123047] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1a3f5c] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer transition-colors"
            :disabled="signing || !isFormValid"
            @click="handleSubmit"
          >
            <span>{{ signing ? "Estampando firma..." : "Confirmar y Firmar Documento" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
