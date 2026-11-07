<script setup lang="ts">
import { ref } from "vue";

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ selected: [file: File | null] }>();
const input = ref<HTMLInputElement | null>(null);
const dragging = ref(false);

function choose() { input.value?.click(); }
function receive(file: File | undefined) {
  if (file) emit("selected", file);
}
function onDrop(event: DragEvent) {
  dragging.value = false;
  receive(event.dataTransfer?.files?.[0]);
}
</script>

<template>
  <div
    class="rounded-2xl border-2 border-dashed p-6 text-center transition"
    :class="dragging ? 'border-[#159c9a] bg-[#eff8f6]' : 'border-[#cbdce2] bg-[#fbfcfd]'"
    @dragenter.prevent="dragging = true"
    @dragover.prevent
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" class="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" :disabled="disabled" @change="receive(($event.target as HTMLInputElement).files?.[0])" />
    <div class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#e6f7f4] text-[#159c9a]">↑</div>
    <p class="mt-3 text-sm font-semibold text-[#17313b]">Arrastra el documento aquí</p>
    <p class="mt-1 text-xs text-[#789098]">PDF, PNG, JPG o DOCX · máximo 20 MiB</p>
    <button type="button" class="focus-ring mt-4 rounded-lg border border-[#b8d2d7] px-4 py-2 text-xs font-semibold text-[#1e5575] hover:bg-white" :disabled="disabled" @click="choose">Seleccionar archivo</button>
  </div>
</template>
