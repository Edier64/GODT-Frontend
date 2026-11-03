import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { JsonSchema } from "../types/document-engine";

export interface FrontendValidationError {
  path: string;
  keyword: string;
  message: string;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);

function errorPath(error: ErrorObject): string {
  const base = !error.instancePath
    ? "$"
    : error.instancePath
        .split("/")
        .slice(1)
        .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
        .reduce(
          (path, segment) =>
            /^\d+$/.test(segment) ? `${path}[${segment}]` : `${path}.${segment}`,
          "$",
        );
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return `${base}.${error.params.missingProperty}`;
  }
  if (
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
  ) {
    return `${base}.${error.params.additionalProperty}`;
  }
  return base;
}

export function validateDocumentResponse(
  schema: JsonSchema,
  value: unknown,
): Record<string, string> {
  const validator = ajv.compile(schema);
  validator(value);
  return Object.fromEntries(
    (validator.errors ?? []).map((error) => [
      errorPath(error),
      error.message ?? "El valor no es válido.",
    ]),
  );
}
