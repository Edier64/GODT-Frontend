import type { DocumentTemplate } from "../types/document-engine";

const DATABASE_NAME = "godt-template-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "templates";

export interface CachedTemplate {
  key: string;
  template: DocumentTemplate;
  downloadedAt: string;
  lastVerifiedAt: string;
  definitionHash: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este dispositivo."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("No fue posible abrir la caché local."));
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function hashDefinition(template: DocumentTemplate): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(template));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function request<T>(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const result = action(transaction.objectStore(STORE_NAME));
    result.onerror = () => reject(result.error ?? new Error("Falló la operación de caché."));
    result.onsuccess = () => resolve(result.result);
    transaction.onerror = () => reject(transaction.error ?? new Error("Falló la transacción de caché."));
  });
}

export const templateCache = {
  async save(templates: DocumentTemplate[]): Promise<void> {
    const database = await openDatabase();
    try {
      const now = new Date().toISOString();
      const entries = await Promise.all(templates.map(async (template) => ({
        key: template.id,
        template,
        downloadedAt: now,
        lastVerifiedAt: now,
        definitionHash: await hashDefinition(template),
      })));
      const transaction = database.transaction(STORE_NAME, "readwrite");
      for (const entry of entries) transaction.objectStore(STORE_NAME).put(entry);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("No fue posible guardar la caché."));
      });
    } finally {
      database.close();
    }
  },
  async list(): Promise<CachedTemplate[]> {
    const database = await openDatabase();
    try {
      return (await request<CachedTemplate[]>(database, "readonly", (store) => store.getAll())) ?? [];
    } finally {
      database.close();
    }
  },
  async clear(): Promise<void> {
    const database = await openDatabase();
    try {
      await request(database, "readwrite", (store) => store.clear());
    } finally {
      database.close();
    }
  },
};
