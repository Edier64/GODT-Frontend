import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPinia, setActivePinia } from "pinia";

// Permite a Node ESM resolver imports TypeScript sin extensión (moduleResolution: Bundler)
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".js") &&
      !specifier.endsWith(".mjs") &&
      context.parentURL?.startsWith("file://")
    ) {
      const candidateUrl = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidateUrl))) {
        return { shortCircuit: true, url: candidateUrl.href };
      }
    }
    return nextResolve(specifier, context);
  },
});

// Mock mínimo de window y localStorage antes de importar servicios/stores
const storageSpy = new Map();
let sessionExpiredEvents = 0;
globalThis.window = {
  dispatchEvent(evt) {
    if (evt?.type === "godt:session-expired") {
      sessionExpiredEvents += 1;
    }
  },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type) {
    this.type = type;
  }
};
globalThis.localStorage = {
  getItem: (k) => storageSpy.get(k) ?? null,
  setItem: (k, v) => storageSpy.set(k, String(v)),
  removeItem: (k) => storageSpy.delete(k),
};

const { api, getApiError } = await import("../src/services/api.ts");
const { useAuthStore } = await import("../src/stores/auth.ts");
const { getAccessToken, clearAccessToken } = await import("../src/services/authSessionBridge.ts");

test("AccessView.vue y AppLayout.vue eliminan accesos rápidos, tokens manuales y mantienen diseño GODT", async () => {
  const [accessView, appLayout] = await Promise.all([
    readFile(new URL("../src/views/AccessView.vue", import.meta.url), "utf8"),
    readFile(new URL("../src/components/AppLayout.vue", import.meta.url), "utf8"),
  ]);

  // Identidad visual GODT
  assert.match(accessView, /#123047/);
  assert.match(accessView, /#159c9a/i);

  // Campos permitidos y UX
  assert.match(accessView, /type="email"/);
  assert.match(accessView, /showPassword \? 'text' : 'password'/);
  assert.match(accessView, /Verificando credenciales\.\.\./);
  assert.match(accessView, /:disabled="!canSubmit"/);
  assert.match(accessView, /resolveSafeRedirect/);

  // Sin accesos rápidos ni pegado manual de JWT ni registro público
  assert.doesNotMatch(accessView, /coordinador@godt\.gov\.co|admin@godt\.gov\.co/i);
  assert.doesNotMatch(accessView, /manualToken|Pegar token Bearer|Aplicar token/i);
  assert.doesNotMatch(appLayout, /showToken|tokenDraft|Guardar Token|Token \/ JWT/i);
  assert.match(appLayout, /Cerrar sesión/);
});

test("Auth Store + Axios: login, almacenamiento exclusivamente en memoria, refresh deduplicado y logout", async () => {
  storageSpy.clear();
  clearAccessToken();
  sessionExpiredEvents = 0;

  let refreshCallCount = 0;
  let logoutCallCount = 0;
  let donorsAttempts = 0;

  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    const url = config.url || "";
    const authHeader = config.headers?.Authorization || config.headers?.authorization;

    if (url.endsWith("/auth/login")) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      if (body.password === "WrongPass!") {
        const err = new Error("Request failed with status code 401");
        err.isAxiosError = true;
        err.config = config;
        err.response = {
          status: 401,
          data: { message: "Credenciales institucionales inválidas." },
          headers: {},
          config,
          statusText: "Unauthorized",
        };
        throw err;
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          accessToken: "jwt-access-1",
          expiresIn: 900,
          user: {
            id: "u-1",
            email: body.email,
            fullName: "Dra. Elena Ramos",
            role: "COORDINATOR",
            institutionalIps: ["Hospital Universitario del Valle"],
          },
        },
      };
    }

    if (url.endsWith("/auth/refresh")) {
      refreshCallCount += 1;
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          accessToken: `jwt-access-refreshed-${refreshCallCount}`,
          expiresIn: 900,
          user: {
            id: "u-1",
            email: "dra.elena@godt.gov.co",
            fullName: "Dra. Elena Ramos",
            role: "COORDINATOR",
            institutionalIps: ["Hospital Universitario del Valle"],
          },
        },
      };
    }

    if (url.endsWith("/auth/me")) {
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          id: "u-1",
          email: "dra.elena@godt.gov.co",
          fullName: "Dra. Elena Ramos",
          role: "COORDINATOR",
          institutionalIps: ["Hospital Universitario del Valle"],
        },
      };
    }

    if (url.endsWith("/auth/logout")) {
      logoutCallCount += 1;
      return { status: 200, statusText: "OK", headers: {}, config, data: { success: true } };
    }

    if (url.endsWith("/donors")) {
      donorsAttempts += 1;
      if (authHeader === "Bearer jwt-access-1") {
        const err = new Error("Unauthorized");
        err.isAxiosError = true;
        err.config = config;
        err.response = { status: 401, data: { message: "Token expirado" }, headers: {}, config, statusText: "Unauthorized" };
        throw err;
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { items: [{ id: "donor-1" }] },
      };
    }

    throw new Error(`Unexpected URL in test adapter: ${url}`);
  };

  try {
    setActivePinia(createPinia());
    const auth = useAuthStore();

    // 1. Error en credenciales inválidas
    await assert.rejects(
      () => auth.login("dra.elena@godt.gov.co", "WrongPass!"),
      (err) => {
        assert.equal(getApiError(err), "Credenciales institucionales inválidas.");
        return true;
      },
    );
    assert.equal(auth.isAuthenticated, false);
    assert.equal(auth.loading, false);

    // 2. Login exitoso conserva JWT solo en memoria
    const profile = await auth.login("dra.elena@godt.gov.co", "ClaveCorrecta#2026");
    assert.equal(profile.email, "dra.elena@godt.gov.co");
    assert.equal(auth.isAuthenticated, true);
    assert.equal(getAccessToken(), "jwt-access-1");
    assert.equal(storageSpy.size, 0, "localStorage no debe recibir JWT ni credenciales");

    // 3. Dos peticiones concurrentes que reciben 401 deben disparar UNA sola renovación y reintentar ambas
    const [r1, r2] = await Promise.all([api.get("/donors"), api.get("/donors")]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(refreshCallCount, 1, "Debe realizarse una única renovación concurrente");
    assert.equal(donorsAttempts, 4, "2 intentos iniciales 401 + 2 reintentos exitosos");
    assert.equal(getAccessToken(), "jwt-access-refreshed-1");

    // 4. Logout revoca en backend y limpia memoria
    await auth.logout();
    assert.equal(logoutCallCount, 1);
    assert.equal(auth.isAuthenticated, false);
    assert.equal(getAccessToken(), "");
    assert.equal(storageSpy.size, 0);
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

test("Axios evita bucle si /auth/refresh falla y dispara session-expired", async () => {
  clearAccessToken();
  sessionExpiredEvents = 0;

  let refreshCalls = 0;
  let protectedCalls = 0;
  const originalAdapter = api.defaults.adapter;

  api.defaults.adapter = async (config) => {
    const url = config.url || "";
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      const err = new Error("Unauthorized");
      err.isAxiosError = true;
      err.config = config;
      err.response = { status: 401, data: { message: "Sesión expirada" }, headers: {}, config, statusText: "Unauthorized" };
      throw err;
    }
    protectedCalls += 1;
    const err = new Error("Unauthorized");
    err.isAxiosError = true;
    err.config = config;
    err.response = { status: 401, data: { message: "Token inválido" }, headers: {}, config, statusText: "Unauthorized" };
    throw err;
  };

  try {
    setActivePinia(createPinia());
    const auth = useAuthStore();

    // Recuperación al recargar con cookie inválida devuelve false sin lanzar
    const recovered = await auth.initializeSession();
    assert.equal(recovered, false);
    assert.equal(auth.initialized, true);
    assert.equal(auth.isAuthenticated, false);

    // Llamada protegida que da 401 -> intenta 1 refresh -> falla -> emite session-expired y NO cicla
    await assert.rejects(() => api.get("/donation-processes"));
    assert.equal(protectedCalls, 1);
    assert.equal(refreshCalls, 2); // 1 de initializeSession + 1 de interceptor 401
    assert.equal(sessionExpiredEvents >= 1, true);
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

test("Vue Router protege rutas privadas, recupera sesión al recargar y preserva redirect", async () => {
  const routerSource = await readFile(new URL("../src/router.ts", import.meta.url), "utf8");
  assert.match(routerSource, /if \(!auth\.initialized\)/);
  assert.match(routerSource, /await auth\.initializeSession\(\)/);
  assert.match(routerSource, /if \(to\.meta\.public\)/);
  assert.match(routerSource, /if \(auth\.isAuthenticated\)/);
  assert.match(routerSource, /path: "\/acceso"/);
  assert.match(routerSource, /redirect: to\.fullPath/);
  assert.doesNotMatch(routerSource, /localStorage/);
});
