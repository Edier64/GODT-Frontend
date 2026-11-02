import { reactive, ref } from "vue";
import type { DocumentProvenance, JsonSchema, JsonSchemaType, TemplateVersion } from "../types/document-engine";

type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string>;

function schemaTypes(schema: JsonSchema): JsonSchemaType[] {
  return Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
}

function allowsNull(schema: JsonSchema) {
  return schema.nullable === true || schemaTypes(schema).includes("null");
}

function schemaType(schema: JsonSchema): JsonSchemaType | undefined {
  return schemaTypes(schema).find((type) => type !== "null");
}

function clone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]));
  return value;
}

export function initialValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return clone(schema.default);
  if (allowsNull(schema)) return null;
  const type = schemaType(schema);
  if (type === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, child]) => [key, initialValue(child)]));
  if (type === "array") return [];
  if (type === "boolean") return false;
  if (type === "number" || type === "integer") return null;
  if (type === "null") return null;
  return "";
}

export function createInitialValues(schema: JsonSchema, seed: FormValues = {}): FormValues {
  const initial = initialValue(schema);
  const base = initial && typeof initial === "object" && !Array.isArray(initial) ? initial as FormValues : {};
  return mergeValues(base, seed);
}

function mergeValues(base: FormValues, seed: FormValues): FormValues {
  const result: FormValues = { ...base };
  for (const [key, value] of Object.entries(seed)) {
    const current = result[key];
    result[key] = current && typeof current === "object" && !Array.isArray(current) && value && typeof value === "object" && !Array.isArray(value)
      ? mergeValues(current as FormValues, value as FormValues)
      : clone(value);
  }
  return result;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "";
}

function typeLabel(schema: JsonSchema) {
  const type = schemaType(schema);
  return type === "integer" || type === "number" ? "un número" : type === "boolean" ? "un valor booleano" : type === "array" ? "una lista" : type === "object" ? "un objeto" : "texto";
}

function matchesType(schema: JsonSchema, value: unknown) {
  const types = schemaTypes(schema);
  if (!types.length || (value === null && allowsNull(schema))) return true;
  if (value === null) return types.includes("null");
  return types.some((type) => (
    (type === "object" && typeof value === "object" && !Array.isArray(value)) ||
    (type === "array" && Array.isArray(value)) ||
    (type === "string" && typeof value === "string") ||
    (type === "number" && typeof value === "number" && Number.isFinite(value)) ||
    (type === "integer" && typeof value === "number" && Number.isInteger(value)) ||
    (type === "boolean" && typeof value === "boolean")
  ));
}

function formatIsValid(format: string, value: string) {
  if (format === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (format === "date-time") return !Number.isNaN(Date.parse(value));
  if (format === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (format === "uri" || format === "uri-reference") {
    try { new URL(value, "https://godt.invalid"); return true; } catch { return false; }
  }
  return true;
}

function validateAlternatives(schema: JsonSchema, value: unknown) {
  const alternatives = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  return alternatives.length === 0 || alternatives.some((alternative) => {
    const errors: FormErrors = {};
    validateNode(alternative, value, "$", errors, false);
    return Object.keys(errors).length === 0;
  });
}

export function validateNode(node: JsonSchema, value: unknown, path: string, output: FormErrors, required = false) {
  if (isEmpty(value)) {
    if (required && !allowsNull(node)) output[path] = "Este campo es obligatorio.";
    return;
  }
  if (!matchesType(node, value)) {
    output[path] = `Debe ser ${typeLabel(node)}.`;
    return;
  }
  if (!validateAlternatives(node, value)) output[path] = "El valor no cumple ninguna estructura permitida.";
  if (node.const !== undefined && value !== node.const) output[path] = "El valor debe coincidir con la plantilla.";
  if (node.enum && !node.enum.some((option) => Object.is(option, value))) output[path] = "Selecciona un valor válido.";

  const type = schemaType(node);
  if (type === "object") {
    const objectValue = value as FormValues;
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      validateNode(child, objectValue[key], `${path}.${key}`, output, node.required?.includes(key) === true);
    }
    if (node.additionalProperties === false && Object.keys(objectValue).some((key) => !node.properties?.[key])) {
      output[path] = "La estructura contiene campos no permitidos.";
    }
  }
  if (type === "array") {
    const items = value as unknown[];
    if (node.minItems !== undefined && items.length < node.minItems) output[path] = `Debe contener al menos ${node.minItems} elemento(s).`;
    if (node.maxItems !== undefined && items.length > node.maxItems) output[path] = `No puede contener más de ${node.maxItems} elemento(s).`;
    if (node.uniqueItems && items.some((item, index) => items.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item)) !== index)) {
      output[path] = "No se permiten elementos repetidos.";
    }
    items.forEach((item, index) => validateNode(node.items ?? {}, item, `${path}[${index}]`, output));
  }
  if (typeof value === "string") {
    if (node.minLength !== undefined && value.length < node.minLength) output[path] = `Mínimo ${node.minLength} caracteres.`;
    if (node.maxLength !== undefined && value.length > node.maxLength) output[path] = `Máximo ${node.maxLength} caracteres.`;
    if (node.pattern) {
      try { if (!new RegExp(node.pattern).test(value)) output[path] = "El formato no es válido."; } catch { output[path] = "La plantilla tiene un patrón inválido."; }
    }
    if (node.format && !formatIsValid(node.format, value)) output[path] = `El valor no cumple el formato ${node.format}.`;
  }
  if (typeof value === "number") {
    if (node.minimum !== undefined && value < node.minimum) output[path] = `Mínimo ${node.minimum}.`;
    if (node.maximum !== undefined && value > node.maximum) output[path] = `Máximo ${node.maximum}.`;
    if (typeof node.exclusiveMinimum === "number" && value <= node.exclusiveMinimum) output[path] = `Debe ser mayor que ${node.exclusiveMinimum}.`;
    if (typeof node.exclusiveMaximum === "number" && value >= node.exclusiveMaximum) output[path] = `Debe ser menor que ${node.exclusiveMaximum}.`;
  }
}

export function useDynamicFormController(version: TemplateVersion, seed: FormValues = {}) {
  const values = reactive(createInitialValues(version.jsonSchema, seed));
  const errors = ref<FormErrors>({});
  const provenance = ref<DocumentProvenance[]>([]);

  function validate() {
    const output: FormErrors = {};
    validateNode(version.jsonSchema, values, "$", output);
    errors.value = output;
    return Object.keys(output).length === 0;
  }

  function setProvenance(value: DocumentProvenance[]) { provenance.value = value.map((item) => ({ ...item })); }
  return { values, errors, provenance, validate, setProvenance };
}
