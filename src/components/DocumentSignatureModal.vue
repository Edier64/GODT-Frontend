<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch } from "vue";
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
  attestationText: "Atestiguo bajo juramento y responsabilidad profesional que he revisado el contenido de este documento y confirmo la veracidad de la información clínica registrada en el proceso de donación.",
  acceptAttestation: true,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);

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
  ctx.lineWidth = 2;
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
}

function stopDrawing() {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  const canvas = canvasRef.value;
  if (canvas) {
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

async function handleSubmit() {
  if (!form.signerName.trim() || !form.signerDocumentNumber.trim()) {
    error.value = "Nombre y número de documento son obligatorios.";
    return;
  }

  if (form.signatureType === "DIGITAL_CERTIFICADA") {
    error.value = "La firma digital certificada no está habilitada operativamente. Requiere integración PKI acreditada por la ONAC (Ley 527/1999).";
    return;
  }

  if (form.signatureType === "ATESTACION_USUARIO" && !form.acceptAttestation) {
    error.value = "Debe aceptar la declaración de atestación bajo juramento.";
    return;
  }

  if (form.signatureType === "DIBUJADA_UI" && !form.signatureData) {
    error.value = "Por favor dibuje la firma en el recuadro antes de confirmar.";
    return;
  }

  signing.value = true;
  error.value = null;

  try {
    await documentLifecycleService.signSnapshot(props.instanceId, props.snapshot.id, {
      participantId: form.participantId || undefined,
      signatureType: form.signatureType,
      signatureData: form.signatureData || undefined,
      attestationText: form.signatureType === "ATESTACION_USUARIO" ? form.attestationText : undefined,
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
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
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
            La firma se vinculará criptográficamente de manera irreversible al hash SHA-256 de este documento. Si los datos clínicos cambian y se genera una nueva versión, este snapshot preservará sus firmas vigentes de manera inmutable.
          </p>
        </div>

        <div v-if="error" class="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          {{ error }}
        </div>

        <!-- Selección de participante o carga manual -->
        <div v-if="participants.length > 0">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Asociar a Participante Asignado (Opcional):
          </label>
          <select
            v-model="form.participantId"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              placeholder="Ej: RM-058921"
            />
          </div>
        </div>

        <!-- Modalidad de Firma -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Modalidad de Firma *
          </label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label
              class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5"
              :class="
                form.signatureType === 'ATESTACION_USUARIO'
                  ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900'
                  : 'border-slate-200 hover:bg-slate-50'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="ATESTACION_USUARIO"
                class="text-teal-600"
              />
              <span>Atestación de Usuario</span>
            </label>

            <label
              class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5"
              :class="
                form.signatureType === 'DIBUJADA_UI'
                  ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900'
                  : 'border-slate-200 hover:bg-slate-50'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="DIBUJADA_UI"
                class="text-teal-600"
              />
              <span>Firma Dibujada en Pantalla</span>
            </label>

            <label
              class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5"
              :class="
                form.signatureType === 'MANUSCRITA_PRESENCIAL'
                  ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900'
                  : 'border-slate-200 hover:bg-slate-50'
              "
            >
              <input
                v-model="form.signatureType"
                type="radio"
                value="MANUSCRITA_PRESENCIAL"
                class="text-teal-600"
              />
              <span>Manuscrita Presencial</span>
            </label>

            <div
              class="flex cursor-not-allowed items-center justify-between rounded-lg border border-slate-200 bg-slate-100 p-2.5 opacity-70"
              title="No habilitada operativamente. Requiere integración PKI con entidad de certificación acreditada por la ONAC (Ley 527/1999)"
            >
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  disabled
                  class="text-slate-400"
                />
                <span class="text-slate-500 line-through">Digital Certificada</span>
              </div>
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                Requiere ONAC
              </span>
            </div>
          </div>
        </div>

        <!-- Declaración y Atestación Bajo Juramento (para ATESTACION_USUARIO) -->
        <div
          v-if="form.signatureType === 'ATESTACION_USUARIO'"
          class="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-2 text-xs"
        >
          <div class="flex items-start gap-2.5">
            <input
              id="attestCheckbox"
              v-model="form.acceptAttestation"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-teal-400 text-teal-700 focus:ring-teal-500"
            />
            <label for="attestCheckbox" class="text-slate-800 font-medium leading-relaxed">
              <strong>Declaración de Atestación Clínica:</strong>
              "{{ form.attestationText }}"
            </label>
          </div>
          <p class="text-[10px] text-teal-800 italic pl-6.5">
            ⚖️ Aviso legal: Esta atestación electrónica vincula su usuario en sesión al documento inmutable conforme a la política GODT Regional 3. No constituye firma digital PKI (Ley 527 de 1999).
          </p>
        </div>

        <!-- Canvas interactivo para firma dibujada -->
        <div v-show="form.signatureType === 'DIBUJADA_UI'" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-700">Dibujar firma:</span>
            <button
              type="button"
              class="text-[11px] text-slate-500 hover:text-slate-800 underline"
              @click="clearCanvas"
            >
              Limpiar recuadro
            </button>
          </div>
          <div class="rounded-xl border border-slate-300 bg-white p-1">
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
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          :disabled="signing"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-[#123047] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1a3f5c] disabled:opacity-50"
          :disabled="signing"
          @click="handleSubmit"
        >
          <span>{{ signing ? "Estampando firma..." : "Confirmar y Firmar Documento" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
