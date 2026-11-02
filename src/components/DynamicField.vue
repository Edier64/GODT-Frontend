<script setup lang="ts">
import { computed } from "vue";
import type { JsonSchema, JsonSchemaType } from "../types/document-engine";

const props = withDefaults(defineProps<{
  name: string;
  schema: JsonSchema;
  modelValue: unknown;
  error?: string;
  errors?: Record<string, string>;
  required?: boolean;
  readonly?: boolean;
}>(), { readonly: false });
const emit = defineEmits<{ "update:modelValue": [value: unknown] }>();

const types = computed<JsonSchemaType[]>(() => Array.isArray(props.schema.type) ? props.schema.type : props.schema.type ? [props.schema.type] : []);
const type = computed<JsonSchemaType | undefined>(() => types.value.find((candidate) => candidate !== "null"));
const nullable = computed(() => props.schema.nullable === true || types.value.includes("null"));
const value = computed({
  get: () => props.schema.format === "date-time" && typeof props.modelValue === "string"
    ? toDateTimeInput(props.modelValue)
    : props.modelValue,
  set: (next: unknown) => emit("update:modelValue", coerce(next))
});
const textValue = computed<string>({
  get: () => value.value === null || value.value === undefined ? "" : String(value.value),
  set: (next) => { value.value = next; }
});
const isObject = computed(() => type.value === "object");
const isArray = computed(() => type.value === "array");
const isBoolean = computed(() => type.value === "boolean");
const isNumber = computed(() => type.value === "number" || type.value === "integer");
const inputType = computed(() => {
  if (props.schema.format === "date") return "date";
  if (props.schema.format === "date-time") return "datetime-local";
  if (props.schema.format === "email") return "email";
  if (props.schema.format === "uri" || props.schema.format === "uri-reference") return "url";
  return isNumber.value ? "number" : "text";
});
const entries = computed(() => Object.entries(props.schema.properties ?? {}));
const items = computed(() => Array.isArray(props.modelValue) ? props.modelValue : []);

function coerce(next: unknown) {
  if (props.schema.format === "date-time" && typeof next === "string" && next) {
    const date = new Date(next);
    return Number.isNaN(date.getTime()) ? next : date.toISOString();
  }
  if (isNumber.value && next !== "" && next !== null) return Number(next);
  if (isBoolean.value) return Boolean(next);
  return next;
}
function childValue(key: string) { return (props.modelValue as Record<string, unknown> | null)?.[key]; }
function setChild(key: string, next: unknown) { emit("update:modelValue", { ...((props.modelValue as Record<string, unknown> | null) ?? {}), [key]: next }); }
function fieldError(path: string) { return props.errors?.[path] ?? ""; }
function toDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function emptyItem(schema: JsonSchema | undefined): unknown {
  if (!schema) return null;
  if (schema.default !== undefined) return schema.default;
  const childType = Array.isArray(schema.type) ? schema.type.find((candidate) => candidate !== "null") : schema.type;
  if (childType === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, child]) => [key, emptyItem(child)]));
  if (childType === "array") return [];
  if (childType === "boolean") return false;
  if (childType === "number" || childType === "integer" || childType === "null" || schema.nullable) return null;
  return "";
}
function addItem() { emit("update:modelValue", [...items.value, emptyItem(props.schema.items)]); }
function removeItem(index: number) { emit("update:modelValue", items.value.filter((_, itemIndex) => itemIndex !== index)); }
function setItem(index: number, next: unknown) { emit("update:modelValue", items.value.map((item, itemIndex) => itemIndex === index ? next : item)); }
function formatOption(option: unknown) { return option === null ? "Sin valor" : String(option); }
function optionValue(option: unknown): string | number | null {
  if (option === null || typeof option === "string" || typeof option === "number") return option;
  return JSON.stringify(option);
}
</script>

<template>
  <fieldset v-if="isObject" class="space-y-4">
    <legend v-if="schema.title || schema.description" class="mb-3 text-sm font-bold text-[#17313b]">{{ schema.title || name }}<span v-if="schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ schema.description }}</span></legend>
    <DynamicField v-for="[key, child] in entries" :key="key" :name="`${name}.${key}`" :schema="child" :model-value="childValue(key)" :error="fieldError(`${name}.${key}`)" :errors="errors" :required="schema.required?.includes(key)" :readonly="readonly" @update:model-value="setChild(key, $event)" />
    <span v-if="error" class="block text-xs text-[#ad4039]">{{ error }}</span>
  </fieldset>
  <fieldset v-else-if="isArray" class="rounded-xl border border-[#dce6eb] bg-[#fbfcfd] p-4">
    <legend class="w-full"><div class="flex items-center justify-between gap-3"><span><span class="text-sm font-semibold text-[#17313b]">{{ schema.title || name }}</span><span v-if="required" class="ml-1 text-[#ad4039]">*</span><span v-if="schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ schema.description }}</span></span><button v-if="!readonly && (schema.maxItems === undefined || items.length < schema.maxItems)" type="button" class="focus-ring rounded-lg border px-3 py-2 text-xs font-semibold text-[#1e5575]" @click="addItem">Agregar</button></div></legend>
    <div v-for="(_, index) in items" :key="index" class="mt-3 flex gap-2"><DynamicField class="min-w-0 flex-1" :name="`${name}[${index}]`" :schema="schema.items || {}" :model-value="items[index]" :error="fieldError(`${name}[${index}]`)" :errors="errors" :readonly="readonly" @update:model-value="setItem(index, $event)" /><button v-if="!readonly" type="button" class="focus-ring self-end rounded-lg px-2 py-2 text-xs text-[#ad4039]" @click="removeItem(index)">Quitar</button></div>
    <p v-if="error" class="mt-2 text-xs font-normal text-[#ad4039]">{{ error }}</p>
  </fieldset>
  <label v-else-if="type !== 'null'" class="block text-sm font-semibold text-[#49636b]">
    {{ schema.title || name }} <span v-if="required" class="text-[#ad4039]">*</span>
    <span v-if="schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ schema.description }}</span>
    <select v-if="schema.enum" v-model="value" class="focus-ring mt-2 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" :disabled="readonly"><option v-if="nullable" :value="null">Sin valor</option><option v-else value="">Selecciona una opción</option><option v-for="option in schema.enum" :key="JSON.stringify(option)" :value="optionValue(option)">{{ formatOption(option) }}</option></select>
    <input v-else-if="isBoolean" v-model="value" type="checkbox" class="focus-ring mt-3 h-4 w-4 rounded border-[#cbdce2]" :disabled="readonly" />
    <textarea v-else-if="schema.format === 'textarea'" v-model="textValue" class="focus-ring mt-2 min-h-24 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" :readonly="readonly" />
    <input v-else v-model="textValue" class="focus-ring mt-2 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" :type="inputType" :min="schema.minimum" :max="schema.maximum" :minlength="schema.minLength" :maxlength="schema.maxLength" :pattern="schema.pattern" :readonly="readonly" />
    <span v-if="error" class="mt-1 block text-xs font-normal text-[#ad4039]">{{ error }}</span>
  </label>
</template>
