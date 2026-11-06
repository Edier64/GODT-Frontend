import type { JsonSchema } from "../types/document-engine";

export interface FrontendValidationError {
  path: string;
  keyword: string;
  message: string;
}

export function validateDocumentResponse(
  schema: JsonSchema,
  value: unknown,
): Record<string, string> {
  const errors: Record<string, string> = {};
  validateNode(schema, value, "$", errors, false);
  return errors;
}

function validateNode(
  schema: JsonSchema,
  value: unknown,
  path: string,
  errors: Record<string, string>,
  required: boolean,
): void {
  const isNullOrUndefined = value === undefined || value === null || value === "";
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const nullable = schema.nullable === true || types.includes("null");

  if (isNullOrUndefined) {
    if (required && !nullable) {
      errors[path] = schema.title ? `${schema.title} es obligatorio.` : "Este campo es obligatorio.";
    }
    return;
  }

  // Object validation
  if (types.includes("object") || (!types.length && schema.properties)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const requiredSet = new Set(schema.required ?? []);
      for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
        validateNode(childSchema, record[key], `${path}.${key}`, errors, requiredSet.has(key));
      }
    }
  }

  // Array validation
  if (types.includes("array") || (!types.length && schema.items)) {
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors[path] = `Se requieren al menos ${schema.minItems} elementos.`;
      }
      if (schema.items) {
        value.forEach((item, index) => {
          validateNode(schema.items!, item, `${path}[${index}]`, errors, false);
        });
      }
    }
  }

  // Integer / Number validation
  if (types.includes("integer") && !Number.isInteger(value)) {
    errors[path] = "Debe ser un número entero válido.";
  } else if (types.includes("number") && typeof value !== "number") {
    errors[path] = "Debe ser un valor numérico.";
  }

  // Format validation
  if (schema.format === "date" && typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors[path] = "Formato de fecha inválido (AAAA-MM-DD).";
  }
}
