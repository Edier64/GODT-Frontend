# Sistema GODT Regional 3 — Frontend SPA & Gateway

Interfaz de usuario web de alta fidelidad clínica para el **Sistema de Gestión Operativa de Donación y Trasplantes (GODT Regional 3, Colombia)**.

Construida con **Vue 3 (Composition API)**, **TypeScript**, **Vite**, **Pinia**, **Vue Router** y **Tailwind CSS v4**. En producción y despliegue cloud, se empaqueta como **`godt-gateway`**, una imagen basada en **Nginx** que sirve los recursos estáticos y actúa como reverse proxy hacia el backend NestJS.

---

## 1. Módulos y Capacidades de la Aplicación

- **Acceso Institucional y Sesiones (`/acceso`):**
  - Autenticación segura mediante correo institucional y contraseña (Argon2id en backend).
  - Renovación transparente de tokens mediante *single-flight refresh* con cookies seguras `HttpOnly`.
  - Cierre de sesión y revocación en base de datos.
- **Tablero Operativo (`/dashboard`):**
  - Métricas reales de donantes en valoración, activos y cerrados.
  - Accesos rápidos a procesos de donación abiertos y alertas institucionales.
- **Procesos de Donación (`/procesos` y `/procesos/:processId`):**
  - Gestión del ciclo de vida del proceso clínico de donación.
  - Asignación de instituciones con roles (IPS Generadora, IPS Extractora, Banco de Tejidos, etc.).
  - Registro de participantes clínicos y representantes legales.
  - Ingesta directa de historias clínicas con extracción automática de campos.
- **Expedientes de Donantes y Documentación (`/expedientes`):**
  - Ficha del donante, código RND, datos antropométricos y serología.
  - Carga y visualización de documentos clínicos privados (PDF, imágenes, Word) con cálculo de hash SHA-256.
- **Extracción Inteligente y Validación OCR (`/ocr`):**
  - Visualización de candidatos extraídos mediante IA multimodal (Google Gemini) o reglas locales.
  - Puntuaciones de confianza clínica, fragmentos de evidencia textual y cuadros delimitadores.
  - Validación humana obligatoria: confirmación, edición o rechazo de cada campo extraído.
- **Catálogo de Formatos y Formularios Dinámicos (`/catalogo` y `/instancias`):**
  - Motor de formularios dinámicos guiado por JSON Schema y UI Schema versión a versión.
  - Historial inmutable de revisiones con comparación visual de diferencias (diff) y proveniencia de cada dato.
  - Resolución explícita de conflictos cuando múltiples fuentes contradicen un campo clínico.
- **Finalización Documental, Firmas y Custodia (`/finalizacion`):**
  - Generación de PDF institucional con marca de agua y estado normativo.
  - Asignación y captura de firmas electrónicas vinculadas a la versión exacta del documento.
  - Registro cronológico inmutable de eventos de cadena de custodia para transporte de órganos y muestras.
- **Consolidación y Verificación de Dossier:**
  - Descarga de expediente consolidado en archivo ZIP y PDF unificado.
  - Verificación criptográfica del manifiesto de integridad con firma de hash SHA-256.

---

## 2. Arquitectura del Frontend

```
src/
├── components/     # Componentes visuales reutilizables (Modales, Visores PDF/Docx, Tablas, Badges)
├── controllers/    # Hooks y lógica de control composable (useDonationProcessController, etc.)
├── services/       # Clientes de API Axios tipados y puente de sesión (api.ts, authSessionBridge.ts)
├── stores/         # Estado global con Pinia (auth.ts para sesión y perfil, donors.ts)
├── types/          # Definiciones TypeScript de entidades y contratos de API
├── views/          # Vistas principales de rutas (Dashboard, Acceso, Expedientes, Procesos, etc.)
├── App.vue         # Componente raíz con layout institucional
├── main.ts         # Inicialización de Vue, Pinia, Router y registro de Service Worker
└── router.ts       # Definición de rutas y Navigation Guards de autenticación
```

### Gestión de Autenticación y Conectividad con el Backend

El cliente HTTP ([src/services/api.ts](./src/services/api.ts)) está configurado con `withCredentials: true` para transmitir y recibir la cookie `HttpOnly` del refresh token:

```
Navegador (Vue SPA :5173) 
   │  
   ├── [Ruta /api/v1/*] ──► Proxy de Vite (Dev) / Nginx (Prod) ──► NestJS Backend (:3000)
   │                           (Reenvía cookies y añade cabeceras)
   └── [Intercepción 401] ─► POST /api/v1/auth/refresh ──► Obtiene nuevo Access Token en memoria
```

---

## 3. Requisitos Previos

- **Node.js:** Versión 20.x o 22.x LTS.
- **npm:** Versión 10+ u 11+.
- **Backend GODT:** El servidor NestJS debe estar en ejecución (normalmente en `http://localhost:3000`) para autenticación y consumo de datos.

---

## 4. Configuración de Variables de Entorno

Cree un archivo `.env` en la raíz de `Frontend` a partir de la plantilla:

```powershell
Copy-Item .env.example .env
```

### Variables Soportadas (`.env`)

```ini
# Ruta base consumida por Axios en el navegador
# Por defecto es '/api/v1' para aprovechar el proxy de mismo origen
VITE_API_BASE_URL=/api/v1

# Dirección del backend destino utilizada EXCLUSIVAMENTE por el servidor de desarrollo de Vite
VITE_API_PROXY_TARGET=http://localhost:3000

# Metadatos de la aplicación
VITE_APP_TITLE=GODT Regional 3 — Gestión Operativa de Donación y Trasplantes
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

> **¿Cómo funciona el proxy de desarrollo?**  
> Cuando el frontend realiza una petición a `/api/v1/donors`, el servidor de Vite (`localhost:5173`) reenvía la petición internamente a `http://localhost:3000/api/v1/donors`. Esto garantiza que el navegador mantenga el mismo origen (`localhost:5173`), evitando bloqueos de cookies de terceros (`SameSite=strict`).

---

## 5. Guía de Ejecución Local

### Paso 1: Instalar Dependencias

```powershell
npm install
```

### Paso 2: Iniciar Servidor de Desarrollo

```powershell
npm run dev
```

El servidor Vite iniciará en **`http://localhost:5173`**.

### Paso 3: Iniciar Sesión

1. Abra su navegador en [http://localhost:5173/acceso](http://localhost:5173/acceso).
2. Ingrese con el usuario institucional creado en el backend:
   - **Correo:** `admin@godt.gov.co` (o el usuario aprovisionado con `npm run auth:provision-user`).
   - **Contraseña:** la asignada durante el aprovisionamiento.
3. El sistema verificará las credenciales, guardará el token de acceso en memoria y establecerá la sesión institucional.

---

## 6. Scripts Disponibles en `package.json`

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo Vite con HMR en el puerto `5173`. |
| `npm run build` | Valida tipos con `vue-tsc --noEmit` y genera el bundle estático de producción en `dist/`. |
| `npm run preview` | Previsualiza localmente la compilación de producción en el puerto `5173`. |
| `npm run test:contracts` | Ejecuta pruebas automáticas de validación de esquemas y contratos de API. |
| `npm run test:auth` | Ejecuta la suite de pruebas del flujo de autenticación y renovación de tokens. |
| `npm run test:e2e` | Ejecuta flujos de prueba de extremo a extremo. |
| `npm run test:visual` | Pruebas de consistencia y componentes de interfaz. |

---

## 7. Despliegue en Producción (`godt-gateway`)

Para entornos productivos y despliegue en la nube (Azure Container Apps / Docker Compose):

### Arquitectura de la Imagen Gateway ([Dockerfile](./Dockerfile))
La compilación utiliza una imagen multi-stage:
1. **Etapa 1 (Builder):** Compila los activos de Vue 3 con `npm run build` usando `VITE_API_BASE_URL=/api/v1`.
2. **Etapa 2 (Nginx Gateway):** Empaqueta los archivos estáticos en `nginx:1.27-alpine` y configura [docker/nginx.conf](./docker/nginx.conf) como plantilla de reverse proxy.

### Variables de Entorno del Gateway en Producción

| Variable | Descripción | Ejemplo Local | Ejemplo Azure ACA |
|---|---|---|---|
| `API_UPSTREAM` | URL de destino del backend NestJS | `http://godt-api:3000` | `https://<fqdn-interno-de-godt-api>` |
| `API_HOST_HEADER` | Cabecera Host enviada al backend | `$http_host` | `<fqdn-interno-de-godt-api>` |
| `NGINX_ENTRYPOINT_LOCAL_RESOLVERS` | Habilita DNS dinámico de Nginx | `1` | `1` |

El contenedor del gateway expone el puerto `80` y cuenta con un endpoint propio de salud en `GET /health` que responde `200 ok`.
