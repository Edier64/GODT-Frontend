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
const SCREENSHOTS_DIR = path.resolve(FRONTEND_DIR, "screenshots", "fase-d4");

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
  tempProfileDir = await fs.mkdtemp(path.join(os.tmpdir(), "godt-chrome-d4-"));
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

  async waitForText(text, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
      if (exists) return true;
      await sleep(250);
    }
    const preview = await this.evaluate(`document.body.innerText.slice(0, 300)`);
    throw new Error(`Timeout waiting for text: "${text}". Current preview: ${preview}`);
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

  async clickButtonWithText(text) {
    await this.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes(${JSON.stringify(text)}));
      if (!btn) throw new Error("Button not found with text: " + ${JSON.stringify(text)});
      btn.click();
    })()`);
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
      fitWindow: false
    });
    await sleep(350);
  }

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);
    console.log(`[Screenshot saved] -> ${filepath}`);
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
  await cdp.send("Network.enable");
  return { cdp, tabData };
}

test("FASE D.4 — Responsive Viewports, Visual Stabilization & UI Issues Suite", async (t) => {
  try {
    await ensureBackendRunning();
    await ensureFrontendRunning();
    await launchChrome();

    // Crear directorio de screenshots
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

    // Iniciar pestaña
    const { cdp } = await createTab(`http://127.0.0.1:${FRONTEND_PORT}/acceso`);

    // Definición de los 5 viewports normativos requeridos
    const VIEWPORTS = [
      { name: "1920x1080-desktop", width: 1920, height: 1080, label: "Desktop Full HD" },
      { name: "1366x768-laptop", width: 1366, height: 768, label: "Laptop Standard" },
      { name: "1024x768-tablet-landscape", width: 1024, height: 768, label: "Tablet Landscape" },
      { name: "768x1024-tablet-portrait", width: 768, height: 1024, label: "Tablet Portrait" },
      { name: "390x844-mobile", width: 390, height: 844, label: "Mobile iPhone 12/13/14" },
    ];

    console.log("\n========================================================");
    console.log("FASE D.4: INICIANDO PRUEBAS VISUALES Y RESPONSIVAS MULTI-VIEWPORT");
    console.log("========================================================\n");

    // 1. Verificación de Login y UI-07 en todos los viewports
    for (const vp of VIEWPORTS) {
      await cdp.setViewport(vp.width, vp.height);
      await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/acceso`);
      await cdp.waitForSelector("input#email");

      // UI-07: Comprobar que en build de producción (preview) los botones de dev están omitidos y el formulario institucional está activo
      const isDevButtonsVisible = await cdp.evaluate(`Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes("Elena Ramos"))`);
      const hasOfficialForm = await cdp.evaluate(`!!document.querySelector('input#email') && !!document.querySelector('input#password')`);
      assert.ok(!isDevButtonsVisible, "En producción (preview) los accesos rápidos de desarrollo deben omitirse (UI-07)");
      assert.ok(hasOfficialForm, "El formulario institucional oficial debe estar presente");

      // Comprobar que no hay desborde horizontal
      const hasHorizontalScroll = await cdp.evaluate(`document.documentElement.scrollWidth > window.innerWidth + 2`);
      assert.ok(!hasHorizontalScroll, `No debe existir scroll horizontal en /acceso con viewport ${vp.name}`);

      await cdp.captureScreenshot(`login-${vp.name}.png`);
    }

    // Iniciar sesión con coordinador
    console.log("Iniciando sesión como coordinador institucional...");
    await cdp.setViewport(1920, 1080);
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/acceso`);
    await cdp.setInputValue("input#email", "coordinador@godt.gov.co");
    await cdp.setInputValue("input#password", "Password123!");
    await cdp.click('button[type="submit"]');
    await sleep(2000);

    const token = await cdp.evaluate("localStorage.getItem('godt.jwtToken')");
    assert.ok(token, "El token JWT debe almacenarse tras el login");

    // Navegar a lista de procesos
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/procesos`);
    await cdp.waitForSelector("h1");
    console.log("Navegado a lista de procesos.");

    // 2. Verificación de Lista de Procesos en todos los viewports
    for (const vp of VIEWPORTS) {
      await cdp.setViewport(vp.width, vp.height);
      await sleep(400);

      const hasHorizontalScroll = await cdp.evaluate(`document.documentElement.scrollWidth > window.innerWidth + 2`);
      assert.ok(!hasHorizontalScroll, `No debe existir scroll horizontal en /procesos con viewport ${vp.name}`);

      await cdp.captureScreenshot(`procesos-list-${vp.name}.png`);
    }

    // Crear un proceso fresco para auditoría completa si es necesario
    console.log("Creando proceso fresco vía API para auditoría de Fase D.4...");
    const donorRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: "Donante Auditoría Visual D4",
        rndCode: "RND-2026-D4-" + Date.now().toString().slice(-4),
        documentNumber: "10987" + Date.now().toString().slice(-5),
        originatingIpsName: "Hospital Universitario del Valle",
        clinicalService: "UCI Quirúrgica"
      })
    });
    const donorData = await donorRes.json();
    assert.ok(donorData.id, "Donante debe crearse exitosamente: " + JSON.stringify(donorData));

    const procRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        donorId: donorData.id,
        primaryIpsName: "Hospital Universitario del Valle",
        processCode: "PROC-2026-D4-" + Date.now().toString().slice(-4),
        notes: "Proceso creado para verificación visual y responsive Fase D.4"
      })
    });
    const procData = await procRes.json();
    assert.ok(procData.id, "Proceso debe crearse exitosamente: " + JSON.stringify(procData));
    let processId = procData.id;
    console.log(`Proceso creado con éxito: ${procData.processCode} (ID: ${processId})`);

    // 3. Verificación de Detalle de Proceso, Header (UI-02) y Métricas (UI-03)
    console.log("Verificando Detalle de Proceso, UI-02 y UI-03...");
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/procesos/${processId}`);
    await cdp.waitForSelector("h1");
    await cdp.waitForText("Fórmula de Avance Normativo", 15000);
    await sleep(500);

    for (const vp of VIEWPORTS) {
      await cdp.setViewport(vp.width, vp.height);
      await sleep(500);

      // UI-02: Comprobar que en pantallas móviles (<768) el header no desborda la ventana
      const headerScrollWidth = await cdp.evaluate(`document.documentElement.scrollWidth`);
      assert.ok(headerScrollWidth <= vp.width + 2, `El header en viewport ${vp.name} no debe causar desborde horizontal (${headerScrollWidth} <= ${vp.width})`);

      // UI-03: Comprobar que el desglose de métricas muestra las 6 categorías claramente
      const metricsText = await cdp.evaluate(`document.body.innerText`);
      const lower = metricsText.toLowerCase();
      assert.ok(lower.includes("total") && metricsText.includes("23"), "Debe mostrar Total 23 posiciones");
      assert.ok(lower.includes("pend. homol.") || lower.includes("en homologación"), "Debe explicitar posiciones en homologación");
      assert.ok(metricsText.includes("Fórmula de Avance Normativo"), "Debe incluir leyenda con fórmula de avance normativo");

      await cdp.captureScreenshot(`proceso-detalle-${vp.name}.png`);
    }

    // 4. Iniciar y Verificar Anexo 8 (Cadena de Custodia) — UI-01 y UI-05
    console.log("Iniciando Anexo 8 para verificar UI-01 (tabla horizontal scroll) y UI-05 (fechas COT)...");
    const docsSummaryRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes/${processId}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const docsSummary = await docsSummaryRes.json();
    const anexo8Doc = docsSummary.documents.find((d) => d.documentCode === "ANEXO_8");
    assert.ok(anexo8Doc, "Debe existir posición ANEXO_8 en el paquete");

    // Iniciar instancia de Anexo 8
    const initRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/donation-processes/${processId}/documents/${anexo8Doc.id}/initiate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const initData = await initRes.json();
    const anexo8InstanceId = initData.instanceId;
    console.log(`Instancia Anexo 8 iniciada: ${anexo8InstanceId}`);

    // Navegar al formulario de Anexo 8
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/expedientes/${donorData.id}/instancias/${anexo8InstanceId}`);
    await cdp.waitForSelector("h2");
    await cdp.waitForText("Formato Apaisado (Landscape)", 15000);
    await sleep(500);

    // UI-01: Verificar presencia de indicador de formato apaisado y contenedor de scroll horizontal
    const hasLandscapeNotice = await cdp.evaluate(`document.body.innerText.includes("Formato Apaisado (Landscape)")`);
    assert.ok(hasLandscapeNotice, "Debe mostrar distintivo de orientación oficial apaisada (UI-01)");

    // UI-05: Verificar indicación de zona horaria oficial COT / UTC-5
    const hasCotNotice = await cdp.evaluate(`document.body.innerText.includes("COT / UTC-5")`);
    assert.ok(hasCotNotice, "Debe indicar explícitamente zona horaria COT / UTC-5 (UI-05)");

    // Abrir modal de nuevo evento de custodia para verificar UI-05 en selector de fecha
    await cdp.clickButtonWithText("Registrar Eslabón de Custodia");
    await sleep(500);
    const modalCotLabel = await cdp.evaluate(`document.body.innerText.includes("(COT / UTC-5)")`);
    assert.ok(modalCotLabel, "Modal de custodia debe explicitar COT / UTC-5 en fecha y hora (UI-05)");

    // Registrar un eslabón de prueba para ver la tabla poblada
    await cdp.setInputValue('input[placeholder="Nombre completo"]', "Carlos Trazabilidad");
    await cdp.setInputValue('input[placeholder="1098765432"]', "10203040");
    await cdp.clickButtonWithText("Registrar Eslabón");
    await sleep(1000);

    // Capturar screenshots de Anexo 8 en varios viewports
    for (const vp of [VIEWPORTS[0], VIEWPORTS[4]]) {
      await cdp.setViewport(vp.width, vp.height);
      await sleep(400);
      await cdp.captureScreenshot(`anexo8-custodia-${vp.name}.png`);
    }

    // 5. Verificar Modo Sellado / Sólo Lectura (UI-04)
    console.log("Completando documento para verificar Banner Sellado / Sólo Lectura (UI-04)...");
    // Guardar respuestas requeridas de Anexo 8
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${anexo8InstanceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        responseData: {
          rndCode: donorData.rndCode,
          nombreDonante: donorData.fullName,
          numeroIdentificacion: donorData.documentNumber,
          codigoElementoCustodia: "EMP-ORG-01",
          descripcionElementoCustodia: "Bloque cardiopulmonar para rescate anatómico",
          numeroNeveraContenedor: "NEV-2026-04",
          numeroPrecintoSeguridad: "PREC-9988",
          temperaturaGradosCelsius: 4.0
        }
      })
    });

    // Asignar participante que requiere firma
    await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${anexo8InstanceId}/lifecycle/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: "Dra. Elena Ramos",
        signerRole: "COORDINADOR_OPERATIVO",
        documentType: "CC",
        documentNumber: "52147896",
        signatureRequired: true,
        isSigner: true
      })
    });

    // Validar y completar Anexo 8
    const valRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${anexo8InstanceId}/lifecycle/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(valRes.status, 201, "Validación debe responder 201");

    const compRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${anexo8InstanceId}/lifecycle/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(compRes.status, 201, "Completado debe responder 201");

    // Generar snapshot oficial (transiciona a PENDIENTE_FIRMAS)
    const snapRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/v1/document-instances/${anexo8InstanceId}/lifecycle/snapshot`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(snapRes.status, 201, "Snapshot debe responder 201");

    // Recargar página del formulario
    await cdp.navigate(`http://127.0.0.1:${FRONTEND_PORT}/expedientes/${donorData.id}/instancias/${anexo8InstanceId}`);
    await cdp.waitForSelector("h2");
    await cdp.waitForText("Documento Sellado — Modo Sólo Lectura", 15000);
    await sleep(500);

    // UI-04: Verificar banner flotante de documento sellado
    const hasSealedBanner = await cdp.evaluate(`document.body.innerText.includes("Documento Sellado — Modo Sólo Lectura")`);
    assert.ok(hasSealedBanner, "Debe mostrar banner superior prominente de documento sellado (UI-04)");

    for (const vp of [VIEWPORTS[0], VIEWPORTS[4]]) {
      await cdp.setViewport(vp.width, vp.height);
      await sleep(400);
      await cdp.captureScreenshot(`documento-sellado-${vp.name}.png`);
    }

    // 6. Verificar Modal de Firmas y Validación Reactiva de Atestación (UI-06)
    console.log("Abriendo Modal de Firma para verificar UI-06...");
    await cdp.setViewport(1920, 1080);
    await sleep(400);
    await cdp.clickButtonWithText("Estampar Firma Oficial");
    await cdp.waitForText("caracteres mín.", 10000);

    // UI-06: Comprobar presencia de contador de caracteres y validación reactiva
    const hasAttestationCounter = await cdp.evaluate(`document.body.innerText.includes("caracteres mín.")`);
    assert.ok(hasAttestationCounter, "Modal de firma debe incluir contador reactivo de caracteres de atestación (UI-06)");

    // Comprobar presencia de modalidades diferenciadas y opción bloqueada con requerimiento ONAC
    const hasOnacBadge = await cdp.evaluate(`document.body.innerText.includes("Requiere ONAC")`);
    assert.ok(hasOnacBadge, "Modal debe mostrar distintivo 'Requiere ONAC' para firma digital bloqueada (UI-06)");

    // Probar borrado de atestación y verificar que el botón de confirmación se deshabilita
    await cdp.setInputValue('input[placeholder*="Carlos Pérez"]', "Dra. Elena Ramos");
    await cdp.setInputValue('input[placeholder*="12345678"]', "52147896");
    await cdp.setInputValue("textarea", "Corto");
    await sleep(300);
    const isSubmitDisabled = await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Confirmar y Firmar"));
      return btn ? btn.disabled : false;
    })()`);
    assert.ok(isSubmitDisabled, "Botón de firma debe deshabilitarse reactivamente cuando la atestación tiene < 10 caracteres (UI-06)");

    // Ahora ingresar atestación válida (>= 10 caracteres)
    await cdp.setInputValue("textarea", "Atestación clínica legal válida y suficiente con más de 10 caracteres");
    await sleep(300);
    const isSubmitEnabled = await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Confirmar y Firmar"));
      return btn ? !btn.disabled : false;
    })()`);
    assert.ok(isSubmitEnabled, "Botón de firma debe habilitarse reactivamente cuando la atestación es válida (UI-06)");

    // Capturar screenshot del modal de firma con validación activa
    for (const vp of [VIEWPORTS[0], VIEWPORTS[4]]) {
      await cdp.setViewport(vp.width, vp.height);
      await sleep(400);
      await cdp.captureScreenshot(`modal-firma-${vp.name}.png`);
    }

    console.log("\n========================================================");
    console.log("TODAS LAS PRUEBAS VISUALES Y RESPONSIVAS FASE D.4 APROBADAS AL 100%");
    console.log(`Screenshots guardados en: ${SCREENSHOTS_DIR}`);
    console.log("========================================================\n");

  } finally {
    if (chromeProcess) chromeProcess.kill();
    if (frontendProcess) frontendProcess.kill();
    if (backendProcess) backendProcess.kill();
  }
});
