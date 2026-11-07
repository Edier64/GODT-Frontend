import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;
const CHROME_DEBUG_PORT = 9222;
const BACKEND_DIR = path.resolve("..", "Backend", "GODT-B");
const FRONTEND_DIR = path.resolve(".");

let backendProcess = null;
let frontendProcess = null;
let chromeProcess = null;
let tempProfileDir = null;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortReachable(port, path = "") {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function ensureBackendRunning() {
  const alive = await isPortReachable(BACKEND_PORT, "/api/v1/auth/me");
  if (alive) {
    console.log("Backend is already running on port", BACKEND_PORT);
    return;
  }
  console.log("Starting backend on port", BACKEND_PORT, "from", BACKEND_DIR);
  backendProcess = spawn("node", ["dist/src/main.js"], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: "inherit"
  });
  const start = Date.now();
  while (Date.now() - start < 25000) {
    if (await isPortReachable(BACKEND_PORT, "/api/v1/auth/me")) {
      console.log("Backend started and healthy!");
      return;
    }
    await sleep(500);
  }
  throw new Error("Backend failed to start within 25 seconds");
}

async function ensureFrontendRunning() {
  const alive = await isPortReachable(FRONTEND_PORT, "/acceso");
  if (alive) {
    console.log("Frontend is already running on port", FRONTEND_PORT);
    return;
  }
  console.log("Starting frontend preview on port", FRONTEND_PORT, "from", FRONTEND_DIR);
  frontendProcess = spawn("node", ["./node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(FRONTEND_PORT)], {
    cwd: FRONTEND_DIR,
    stdio: "inherit"
  });
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await isPortReachable(FRONTEND_PORT, "/acceso")) {
      console.log("Frontend preview is reachable!");
      return;
    }
    await sleep(500);
  }
  throw new Error("Frontend failed to start within 15 seconds");
}

async function launchChrome() {
  tempProfileDir = await fs.mkdtemp(path.join(os.tmpdir(), "godt-chrome-"));
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  console.log("Launching headless Chrome on port", CHROME_DEBUG_PORT);
  chromeProcess = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    "--disable-gpu",
    "--no-first-run",
    `--user-data-dir=${tempProfileDir}`
  ]);
  const start = Date.now();
  while (Date.now() - start < 10000) {
    if (await isPortReachable(CHROME_DEBUG_PORT, "/json/version")) {
      console.log("Chrome CDP ready!");
      return;
    }
    await sleep(250);
  }
  throw new Error("Chrome failed to initialize CDP");
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === "Console.messageAdded") {
        console.log("[Console Message]", data.params.message?.level, data.params.message?.text);
      }
      if (data.method === "Runtime.consoleAPICalled") {
        console.log("[Browser Console]", data.params.type, data.params.args?.map(a => a.value ?? a.description ?? "").join(" "));
      }
      if (data.method === "Runtime.exceptionThrown") {
        console.error("[Browser Exception]", data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
      }
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || "Evaluation error");
    }
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
      if (exists) return true;
      await sleep(200);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(1500);
  }

  async setInputValue(selector, value) {
    await this.waitForSelector(selector);
    await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      el.focus();
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
  }

  async click(selector) {
    await this.waitForSelector(selector);
    await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      el.click();
    })()`);
  }
}

async function createTab(initialUrl) {
  const createRes = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/new?${encodeURIComponent(initialUrl)}`, { method: "PUT" });
  const tabData = await createRes.json();
  const ws = new WebSocket(tabData.webSocketDebuggerUrl);
  await new Promise((resolve) => { ws.onopen = resolve; });
  const cdp = new CdpSession(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Console.enable");
  await cdp.send("Network.enable");
  return { cdp, tabData };
}

test("E2E Navigation Workflow: Institutional Login -> Process Detail -> 23 Positions -> Dynamic Form -> Snapshot & PDF Download", async () => {
  try {
    await ensureBackendRunning();
    await ensureFrontendRunning();
    await launchChrome();

    const { cdp } = await createTab(`http://127.0.0.1:${FRONTEND_PORT}/acceso`);

    console.log("1. Verifying Access / Login view...");
    await cdp.waitForSelector("#email");
    const heading = await cdp.evaluate("document.querySelector('h1')?.innerText");
    console.log("Page heading:", heading);
    assert.match(heading, /Sistema GODT Regional 3/);

    console.log("2. Performing institutional login...");
    await cdp.setInputValue("#email", "coordinador@godt.gov.co");
    await cdp.setInputValue("#password", "Password123!");
    await cdp.click("button[type='submit']");

    console.log("3. Waiting for authentication and navigation...");
    let redirected = false;
    for (let i = 0; i < 30; i++) {
      const currentUrl = await cdp.evaluate("window.location.pathname");
      const token = await cdp.evaluate("localStorage.getItem('godt.jwtToken')");
      if (token && (currentUrl === "/dashboard" || currentUrl === "/procesos")) {
        console.log("Authenticated successfully, token stored! Current path:", currentUrl);
        redirected = true;
        break;
      }
      await sleep(300);
    }
    assert.ok(redirected, "Failed to navigate after login");

    console.log("4. Navigating to Donation Processes list...");
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/procesos`);
    await sleep(1500);

    console.log("5. Creating fresh donor and donation process for E2E run...");
    const runId = Date.now();
    const token = await cdp.evaluate("localStorage.getItem('godt.jwtToken')");

    // Create fresh donor
    const donorRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        rndCode: `RND-E2E-${String(runId).slice(-6)}`,
        documentNumber: `E2E-${String(runId).slice(-8)}`,
        fullName: "Carlos Gomez Donante E2E",
        originatingIpsName: "Hospital Universitario del Valle",
        clinicalService: "UCI Neurocríticos",
        bloodGroup: "O",
        rhFactor: "POSITIVO"
      })
    });
    assert.equal(donorRes.status, 201, "Donor creation must succeed");
    const donorData = await donorRes.json();
    const donorId = donorData.id;

    // Create fresh process
    const processRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        donorId,
        primaryIpsName: "Hospital Universitario del Valle",
        processCode: `PROC-E2E-${runId}`,
        notes: "Proceso para validación de flujo de navegación E2E"
      })
    });
    assert.equal(processRes.status, 201, "Process creation must succeed");
    const processData = await processRes.json();
    const processId = processData.id;
    console.log(`Created fresh process ${processId} for donor ${donorId}`);

    console.log(`6. Navigating to process detail: /procesos/${processId}...`);
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/procesos/${processId}`);
    await sleep(2000);

    const currentPath = await cdp.evaluate("window.location.pathname");
    const mainHtml = await cdp.evaluate("document.querySelector('main')?.innerHTML");
    console.log("Current path at step 7:", currentPath);
    console.log("Main HTML length at step 7:", mainHtml?.length, "Snippet:", mainHtml?.substring(0, 400));

    console.log("7. Verifying 23 positions package in UI...");
    await cdp.waitForSelector("div.p-4.rounded-xl.border");
    const uiPositions = await cdp.evaluate(`
      Array.from(document.querySelectorAll("span")).filter(s => s.innerText?.includes("Posición")).length
    `);
    console.log("UI rendered positions count:", uiPositions);
    assert.equal(uiPositions, 23, "UI must render all 23 positions");

    // Verify positions via API contract as well to confirm complete 23 positions package
    const docsSummaryRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes/${processId}/documents`, {
      headers: {
        Authorization: `Bearer ${await cdp.evaluate("localStorage.getItem('godt.jwtToken')")}`
      }
    });
    assert.equal(docsSummaryRes.status, 200);
    const docsSummary = await docsSummaryRes.json();
    console.log("API returned process documents count:", docsSummary.documents.length);
    assert.equal(docsSummary.documents.length, 23, "Must have exactly 23 positions");

    // Verify positions 20-23 are PENDING_HOMOLOGATION
    const pendingHomologation = docsSummary.documents.filter(d => d.category === "PENDING_HOMOLOGATION");
    console.log("Positions marked as PENDING_HOMOLOGATION:", pendingHomologation.map(d => `${d.positionNumber}: ${d.title}`));
    assert.equal(pendingHomologation.length, 4, "Positions 20 to 23 must be PENDING_HOMOLOGATION");

    console.log("8. Initiating / opening normative Anexo 1...");
    const anexo1 = docsSummary.documents.find(d => d.positionNumber === 1);
    assert.ok(anexo1, "Position 1 (Anexo 1) must exist");

    let instanceId = anexo1.currentInstanceId;
    if (!instanceId) {
      const initRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes/${processId}/documents/${anexo1.id}/initiate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await cdp.evaluate("localStorage.getItem('godt.jwtToken')")}`
        }
      });
      assert.equal(initRes.status, 201);
      const initData = await initRes.json();
      instanceId = initData.instanceId;
      console.log("Initiated instance for Anexo 1:", instanceId);
    } else {
      console.log("Existing instance for Anexo 1:", instanceId);
    }

    console.log(`9. Navigating to document editor: /expedientes/${donorId}/instancias/${instanceId}...`);
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/expedientes/${donorId}/instancias/${instanceId}`);
    await sleep(2500);

    const docHeading = await cdp.evaluate("document.querySelector('h1, h2')?.innerText");
    console.log("Document view heading:", docHeading);

    console.log("10. Saving revision with synthetic clinical payload...");
    const testData = {
      nombreDonante: "Carlos Gomez",
      tipoIdentificacion: "CC",
      numeroIdentificacion: "1098765432",
      edad: 42,
      sexo: "MASCULINO",
      grupoSanguineo: "O",
      factorRh: "POSITIVO",
      ipsGeneradora: "Hospital Universitario del Valle",
      causaMuerte: "Trauma Craneoencefálico Severo",
      glasgowScore: 3,
      muerteEncefalicaConfirmada: true,
      tensionArterialSistolica: 120,
      tensionArterialDiastolica: 80,
      frecuenciaCardiaca: 82,
      temperaturaCorporal: 36.5,
      primerNombre: "Carlos",
      primerApellido: "Gomez",
      motivoIngreso: "Trauma craneoencefalico severo",
      diagnosticoMuerteEncefalica: true,
      fechaHoraMuerteEncefalica: "2026-11-06T14:30:00Z"
    };

    const saveRevRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        responseData: testData
      })
    });
    assert.equal(saveRevRes.status, 200, "Revision save must succeed");
    const revResult = await saveRevRes.json();
    console.log("Saved revision ID:", revResult.currentRevisionId);

    // Assign participant with signature requirement
    await fetch(
      `http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}/lifecycle/participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: "Dra. Elena Ramos",
          documentType: "CC",
          documentNumber: "31888999",
          signerRole: "COORDINADOR_OPERATIVO",
          isSigner: true,
          signatureRequired: true,
          signatureOrder: 1,
        }),
      },
    );

    console.log("11. Validating document lifecycle...");
    const validateRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}/lifecycle/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (validateRes.status !== 200 && validateRes.status !== 201) {
      console.error("Validation error body:", await validateRes.text());
    }
    assert.ok([200, 201].includes(validateRes.status), "Validate must return 200 or 201");
    const valResult = await validateRes.json();
    console.log("Validation result status:", valResult.status);

    console.log("12. Completing document...");
    const completeRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}/lifecycle/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (completeRes.status !== 200 && completeRes.status !== 201) {
      console.error("Complete error body:", await completeRes.text());
    }
    assert.ok([200, 201].includes(completeRes.status));
    const compResult = await completeRes.json();
    console.log("Document lifecycle status:", compResult.status);
    assert.ok(["COMPLETADO", "PENDIENTE_FIRMAS"].includes(compResult.status));

    console.log("13. Generating PDF snapshot...");
    const snapRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}/lifecycle/snapshot`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(snapRes.status, 201);
    const snapData = await snapRes.json();
    const snapshotId = snapData.snapshot?.id || snapData.id || snapData.snapshotId;
    console.log("Generated snapshot ID:", snapshotId, "SHA-256:", snapData.sha256Hash?.substring(0, 16) + "...");
    assert.ok(snapData.sha256Hash, "Snapshot must have SHA-256 hash");
    assert.ok(snapshotId, "Snapshot must have an ID");

    console.log("14. Downloading PDF and validating binary format...");
    const pdfRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${instanceId}/lifecycle/snapshots/${snapshotId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    console.log("Downloaded PDF size in bytes:", pdfBuffer.length);
    assert.ok(pdfBuffer.length > 500, "PDF must not be empty");
    const pdfHeader = pdfBuffer.subarray(0, 5).toString("utf-8");
    console.log("PDF header magic bytes:", pdfHeader);
    assert.equal(pdfHeader, "%PDF-", "Binary must be a valid PDF document starting with %PDF-");

    console.log("🎉 E2E Navigation Workflow successfully completed 100%!");
  } finally {
    if (chromeProcess) {
      try { chromeProcess.kill(); } catch {}
    }
    if (frontendProcess) {
      try { frontendProcess.kill(); } catch {}
    }
    if (backendProcess) {
      try { backendProcess.kill(); } catch {}
    }
    if (tempProfileDir) {
      try { await fs.rm(tempProfileDir, { recursive: true, force: true }); } catch {}
    }
  }
});
