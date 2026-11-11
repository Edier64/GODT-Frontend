import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../src/", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("frontend services preserve the verified donor, document, OCR and engine routes", async () => {
  const [donors, documents, ocr, catalog, instances] = await Promise.all([
    source("services/donors.ts"),
    source("services/documents.ts"),
    source("services/ocr.ts"),
    source("services/documentCatalog.ts"),
    source("services/documentInstances.ts")
  ]);

  for (const route of [
    "/donors",
    "/documents/${id}",
    "/donors/${donorId}/documents",
    "/documents/${id}/download"
  ]) assert.match(`${donors}\n${documents}`, new RegExp(route.replace(/[${}]/g, "\\$&")));
  for (const route of ["/documents/${documentId}/ocr", "/ocr/jobs/${jobId}", "/ocr/fields/${fieldId}/validation"]) {
    assert.match(ocr, new RegExp(route.replace(/[${}]/g, "\\$&")));
  }
  const ocrTypes = await source("types/ocr.ts");
  assert.match(ocrTypes, /status: OcrJobStatus/);
  for (const route of ["/document-catalog", "/document-catalog/${templateId}/versions"]) {
    assert.match(catalog, new RegExp(route.replace(/[${}]/g, "\\$&")));
  }
  for (const route of [
    "/donors/${donorId}/document-instances",
    "/document-instances/${id}",
    "/document-instances/${id}/validate"
  ]) assert.match(instances, new RegExp(route.replace(/[${}]/g, "\\$&")));
  assert.doesNotMatch(instances, /templateVersionId:\s*instance/);
  const legalization = await source("services/legalization.ts");
  assert.match(legalization, /\/donors\/\$\{donorId\}\/legalization/);
  const finalization = await source("controllers/useDocumentFinalizationController.ts");
  assert.match(finalization, /documentInstancesService\.validate/);
});

test("frontend dossier service preserves the 7 verified endpoints (Fase E)", async () => {
  const dossier = await source("services/dossier.ts");
  const dossierTypes = await source("types/dossier.ts");

  for (const route of [
    "/donation-processes/${processId}/dossier/exports",
    "/donation-processes/${processId}/dossier/exports/${exportId}",
    "/donation-processes/${processId}/dossier/exports/${exportId}/download",
    "/donation-processes/${processId}/dossier/exports/${exportId}/consolidated-pdf",
    "/donation-processes/${processId}/dossier/exports/${exportId}/manifest",
    "/donation-processes/${processId}/dossier/exports/${exportId}/verify",
  ]) {
    assert.match(dossier, new RegExp(route.replace(/[${}]/g, "\\$&")));
  }

  assert.match(dossierTypes, /export type DossierExportType/);
  assert.match(dossierTypes, /export type DossierExportStatus/);
  assert.match(dossierTypes, /export interface DossierManifest/);
  assert.match(dossierTypes, /export interface IntegrityVerificationReport/);
});

test("real API authentication smoke test", { skip: process.env.GODT_RUN_REAL_API !== "1" }, async () => {
  const baseUrl = process.env.GODT_API_BASE_URL || "http://localhost:3000/api/v1";
  const response = await fetch(`${baseUrl}/donors`);
  assert.equal(response.status, 401, "unauthenticated donor access must be rejected");
});

test("frontend enforces authenticated navigation, memory-only JWT and single-flight refresh on 401", async () => {
  const [router, api, authStore, accessView, docs] = await Promise.all([
    source("router.ts"),
    source("services/api.ts"),
    source("stores/auth.ts"),
    source("views/AccessView.vue"),
    source("services/documents.ts")
  ]);
  assert.match(router, /beforeEach/);
  assert.match(router, /initializeSession/);
  assert.match(router, /isAuthenticated/);
  assert.doesNotMatch(router, /localStorage/);
  assert.doesNotMatch(authStore, /localStorage|sessionStorage/);
  assert.doesNotMatch(api, /localStorage|sessionStorage/);
  assert.match(api, /withCredentials:\s*true/);
  assert.match(api, /status !== 401|status === 401/);
  assert.match(api, /requestSingleFlightRefresh/);
  assert.match(await source("services/authSessionBridge.ts"), /session-expired/);
  assert.doesNotMatch(accessView, /manualToken|coordinador@godt\.gov\.co|admin@godt\.gov\.co/);
  assert.match(docs, /setTimeout\(\(\) => URL\.revokeObjectURL/);
});

test("frontend institution & document viewer contracts preserve verified endpoints (Fase G.1.3)", async () => {
  const [institutions, instTypes, canonicalTypes] = await Promise.all([
    source("services/institutions.ts"),
    source("types/institutions.ts"),
    source("types/canonical.ts"),
  ]);

  for (const route of [
    "/institutions/search",
    "/institutions",
    "/institutions/${institutionId}/request-association",
    "/catalogs/clinical-services",
    "/catalogs/professionals",
    "/document-templates/institutional-inventory",
    "/document-templates/${code}/original-metadata",
    "/document-templates/${code}/original-file",
    "/document-instances/${instanceId}/preview-pdf",
  ]) {
    assert.match(institutions, new RegExp(route.replace(/[${}]/g, "\\$&")));
  }

  assert.match(instTypes, /export interface InstitutionSearchResult/);
  assert.match(instTypes, /export interface InstitutionalDocumentMetadata/);
  assert.match(instTypes, /export interface CreateInstitutionPayload/);
  assert.match(canonicalTypes, /canonicalFieldKey\?: string/);
});
