<script setup lang="ts">
import { computed } from "vue";
import type { DependencyConfig, JsonSchema, JsonSchemaType, UiFieldConfig, UiSchema, UiTableColumn } from "../types/document-engine";
import { dependencyForPath, evaluateDependency } from "../controllers/useDynamicFormController";

const props = withDefaults(defineProps<{
  name: string;
  schema: JsonSchema;
  modelValue: unknown;
  error?: string;
  errors?: Record<string, string>;
  required?: boolean;
  readonly?: boolean;
  ui?: UiFieldConfig;
  uiSchema?: UiSchema;
  dependencyConfig?: DependencyConfig;
  values?: Record<string, unknown>;
}>(), { readonly: false });
const emit = defineEmits<{ "update:modelValue": [value: unknown] }>();

const types = computed<JsonSchemaType[]>(() => Array.isArray(props.schema.type) ? props.schema.type : props.schema.type ? [props.schema.type] : []);
const type = computed<JsonSchemaType | undefined>(() => types.value.find((candidate) => candidate !== "null"));
const nullable = computed(() => props.schema.nullable === true || types.value.includes("null"));
const isReadonly = computed(() => props.readonly || props.ui?.readonly === true);
const dependency = computed(() => dependencyForPath(props.dependencyConfig, props.name));
const isVisible = computed(() => !dependency.value?.visibleWhen || evaluateDependency(dependency.value.visibleWhen, props.values ?? {}));
const isDisabled = computed(() => isReadonly.value || Boolean(dependency.value?.enabledWhen && !evaluateDependency(dependency.value.enabledWhen, props.values ?? {})));
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
const isTable = computed(() => isArray.value && props.ui?.component === "table" && props.schema.items?.type === "object");
const tableColumns = computed<UiTableColumn[]>(() => props.ui?.columns?.length
  ? props.ui.columns
  : Object.keys(props.schema.items?.properties ?? {}).map((key) => ({ key })));
const fieldLabel = computed(() => props.ui?.label || props.schema.title || readableName(props.name));

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
function fieldUi(path: string) { return props.uiSchema?.fieldConfigs?.[path]; }
function itemValue(index: number, key: string) {
  const item = items.value[index];
  return item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>)[key] : undefined;
}
function setTableCell(index: number, key: string, next: unknown) {
  const item = items.value[index];
  const base = item && typeof item === "object" && !Array.isArray(item) ? item : {};
  setItem(index, { ...base, [key]: next });
}
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
function readableName(path: string) {
  const key = path.split(/[.[\]]/).filter(Boolean).pop() ?? path;
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}
</script>

<template>
  <template v-if="isVisible">
  <fieldset v-if="isObject" class="space-y-4">
    <legend v-if="schema.title || schema.description" class="mb-3 text-sm font-bold text-[#17313b]">{{ schema.title || name }}<span v-if="schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ schema.description }}</span></legend>
    <DynamicField v-for="[key, child] in entries" :key="key" :name="`${name}.${key}`" :schema="child" :model-value="childValue(key)" :error="fieldError(`${name}.${key}`)" :errors="errors" :required="schema.required?.includes(key)" :readonly="isDisabled" :ui="fieldUi(`${name}.${key}`)" :ui-schema="uiSchema" :dependency-config="dependencyConfig" :values="values" @update:model-value="setChild(key, $event)" />
    <span v-if="error" class="block text-xs text-[#ad4039]">{{ error }}</span>
  </fieldset>
  <fieldset v-else-if="isTable" class="rounded-xl border border-[#dce6eb] bg-[#fbfcfd] p-4">
    <legend class="w-full"><div class="flex items-center justify-between gap-3"><span><span class="text-sm font-semibold text-[#17313b]">{{ fieldLabel }}</span><span v-if="required" class="ml-1 text-[#ad4039]">*</span><span v-if="ui?.description || schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ ui?.description || schema.description }}</span></span>    <button v-if="!isDisabled && (schema.maxItems === undefined || items.length < schema.maxItems)" type="button" class="focus-ring rounded-lg border px-3 py-2 text-xs font-semibold text-[#1e5575]" @click="addItem">Agregar fila</button></div></legend>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
        <caption class="sr-only">{{ fieldLabel }}</caption>
        <thead><tr><th v-for="column in tableColumns" :key="column.key" :style="{ width: column.width }" class="border-b border-[#dce6eb] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#49636b]">{{ column.label || schema.items?.properties?.[column.key]?.title || column.key }}</th><th class="border-b border-[#dce6eb] px-3 py-2" /></tr></thead>
        <tbody>
          <tr v-for="(_, index) in items" :key="`${name}-${index}`">
            <td v-for="column in tableColumns" :key="column.key" class="border-b border-[#edf2f3] px-2 py-2 align-top">
              <DynamicField :name="`${name}[${index}].${column.key}`" :schema="schema.items?.properties?.[column.key] || {}" :model-value="itemValue(index, column.key)" :error="fieldError(`${name}[${index}].${column.key}`)" :errors="errors" :required="schema.items?.required?.includes(column.key)" :readonly="isDisabled" :ui="{ ...(fieldUi(`${name}[].${column.key}`) ?? {}), label: column.label || schema.items?.properties?.[column.key]?.title }" :ui-schema="uiSchema" :dependency-config="dependencyConfig" :values="values" @update:model-value="setTableCell(index, column.key, $event)" />
            </td>
            <td class="border-b border-[#edf2f3] px-2 py-2 align-top"><button v-if="!isDisabled" type="button" class="focus-ring rounded-lg px-2 py-2 text-xs text-[#ad4039]" @click="removeItem(index)">Quitar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!items.length" class="mt-3 text-xs text-[#789098]">No hay filas agregadas.</p>
    <p v-if="error" class="mt-2 text-xs font-normal text-[#ad4039]">{{ error }}</p>
  </fieldset>
  <fieldset v-else-if="isArray" class="rounded-xl border border-[#dce6eb] bg-[#fbfcfd] p-4">
    <legend class="w-full"><div class="flex items-center justify-between gap-3"><span><span class="text-sm font-semibold text-[#17313b]">{{ schema.title || name }}</span><span v-if="required" class="ml-1 text-[#ad4039]">*</span>    <span v-if="ui?.description || schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ ui?.description || schema.description }}</span></span><button v-if="!isDisabled && (schema.maxItems === undefined || items.length < schema.maxItems)" type="button" class="focus-ring rounded-lg border px-3 py-2 text-xs font-semibold text-[#1e5575]" @click="addItem">Agregar</button></div></legend>
    <div v-for="(_, index) in items" :key="index" class="mt-3 flex gap-2"><DynamicField class="min-w-0 flex-1" :name="`${name}[${index}]`" :schema="schema.items || {}" :model-value="items[index]" :error="fieldError(`${name}[${index}]`)" :errors="errors" :readonly="isDisabled" :dependency-config="dependencyConfig" :values="values" @update:model-value="setItem(index, $event)" /><button v-if="!isDisabled" type="button" class="focus-ring self-end rounded-lg px-2 py-2 text-xs text-[#ad4039]" @click="removeItem(index)">Quitar</button></div>
    <p v-if="error" class="mt-2 text-xs font-normal text-[#ad4039]">{{ error }}</p>
  </fieldset>
  <label v-else-if="type !== 'null'" class="block text-sm font-semibold text-[#49636b]">
    {{ fieldLabel }} <span v-if="required" class="text-[#ad4039]">*</span>
    <span v-if="ui?.description || schema.description" class="mt-1 block text-xs font-normal text-[#789098]">{{ ui?.description || schema.description }}</span>
    <span v-if="ui?.help" class="mt-1 block text-xs font-normal text-[#789098]">{{ ui.help }}</span>
    <select v-if="schema.enum" v-model="value" class="focus-ring mt-2 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" :disabled="isDisabled"><option v-if="nullable" :value="null">Sin valor</option><option v-else value="">Selecciona una opción</option><option v-for="option in schema.enum" :key="JSON.stringify(option)" :value="option">{{ formatOption(option) }}</option></select>
    <input v-else-if="isBoolean" v-model="value" type="checkbox" class="focus-ring mt-3 h-4 w-4 rounded border-[#cbdce2]" :disabled="isDisabled" />
    <textarea v-else-if="schema.format === 'textarea' || ui?.component === 'textarea'" v-model="textValue" class="focus-ring mt-2 min-h-24 w-full rounded-lg border border-[#cbdce2] p-3 text-sm font-normal" :readonly="isDisabled" />
    <input v-else v-model="textValue" class="focus-ring mt-2 w-full rounded-lg border border-[#cbdce2] px-3 py-3 text-sm font-normal" :type="inputType" :min="schema.minimum" :max="schema.maximum" :minlength="schema.minLength" :maxlength="schema.maxLength" :pattern="schema.pattern" :readonly="isDisabled" />
    <span v-if="error" class="mt-1 block text-xs font-normal text-[#ad4039]">{{ error }}</span>
  </label>
  </template>
</template>
