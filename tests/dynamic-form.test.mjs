import assert from "node:assert/strict";
import { test } from "node:test";

function validate(schema, value, path = "$", errors = {}, required = false) {
  const empty = value === undefined || value === null || value === "";
  if (empty) {
    if (required && !(schema.nullable || (Array.isArray(schema.type) && schema.type.includes("null")))) errors[path] = "required";
    return errors;
  }
  if (schema.type === "object") {
    for (const [key, child] of Object.entries(schema.properties ?? {})) validate(child, value[key], `${path}.${key}`, errors, schema.required?.includes(key));
  }
  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors[path] = "minItems";
    value.forEach((item, index) => validate(schema.items ?? {}, item, `${path}[${index}]`, errors));
  }
  if (schema.type === "integer" && !Number.isInteger(value)) errors[path] = "integer";
  if (schema.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[path] = "date";
  return errors;
}

test("nested required fields and array item paths remain precise", () => {
  const schema = {
    type: "object",
    required: ["identity", "custody"],
    properties: {
      identity: { type: "object", required: ["document"], properties: { document: { type: "string" } } },
      custody: { type: "array", minItems: 1, items: { type: "object", required: ["handler"], properties: { handler: { type: "string" } } } }
    }
  };
  assert.deepEqual(validate(schema, { identity: {}, custody: [{}] }), {
    "$.identity.document": "required",
    "$.custody[0].handler": "required"
  });
});

test("nullable values and schema formats are accepted or rejected explicitly", () => {
  assert.deepEqual(validate({ type: ["string", "null"], nullable: true }, null), {});
  assert.deepEqual(validate({ type: "string", format: "date" }, "2026-11-02"), {});
  assert.deepEqual(validate({ type: "integer" }, 1.5), { "$": "integer" });
});
