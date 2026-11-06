import { reactive, ref } from "vue";
import type { DependencyConfig, DependencyRule, DocumentProvenance, JsonSchema, JsonSchemaType, TemplateVersion } from "../types/document-engine";
import { validateDocumentResponse } from "../services/documentResponseValidator";

type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string>;

function readPath(value: unknown, path: string): unknown {
  const segments = path.slice(2).split(".").filter(Boolean);
  let current: unknown = value;
  for (const rawSegment of segments) {
    if (rawSegment.endsWith("[]")) {
      if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
      const array = (current as Record<string, unknown>)[rawSegment.slice(0, -2)];
      return Array.isArray(array) ? array : undefined;
    }
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[rawSegment];
  }
  return current;
}

export function evaluateDependency(
  rule: DependencyRule,
  values: FormValues,
): boolean {
  if ("all" in rule) return rule.all.every((child) => evaluateDependency(child, values));
  if ("any" in rule) return rule.any.some((child) => evaluateDependency(child, values));
  if ("not" in rule) return !evaluateDependency(rule.not, values);
  const actual = readPath(values, rule.field);
  if ("equals" in rule) return Object.is(actual, rule.equals);
  if ("in" in rule && Array.isArray(rule.in)) return rule.in.some((option) => Object.is(actual, option));
  return Boolean(actual);
}

export function dependencyForPath(config: DependencyConfig | undefined, path: string) {
  if (!config) return undefined;
  return config.fields[path] ?? config.fields[path.replace(/\[\d+\]/g, "[]")];
}

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

export function useDynamicFormController(version: TemplateVersion, seed: FormValues = {}) {
  const values = reactive(createInitialValues(version.jsonSchema, seed));
  const errors = ref<FormErrors>({});
  const provenance = ref<DocumentProvenance[]>([]);

  function validate() {
    errors.value = validateDocumentResponse(version.jsonSchema, values);
    return Object.keys(errors.value).length === 0;
  }

  function setProvenance(value: DocumentProvenance[]) { provenance.value = value.map((item) => ({ ...item })); }
  return { values, errors, provenance, validate, setProvenance };
}
