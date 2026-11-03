# GODT Regional 3 — Frontend

Frontend Vue 3 + TypeScript + Vite para el MVP de gestión documental GODT. El
backend de referencia es `Feature/Legalizacion` en `D:\Universidad\Diplomado\GODT\Backend\GODT-B`.

## Instalación y ejecución

Requisitos: Node.js compatible con Vite y npm.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

La aplicación usa `/api/v1` por defecto y el proxy local apunta a
`http://localhost:3000`. Para otro destino, configure `VITE_API_BASE_URL` en
`.env`. El backend no expone login: la demo recibe un JWT emitido por el
proveedor institucional en la pantalla `/acceso`.

## Validación local

```powershell
npm exec vue-tsc -- --noEmit
npm run build
npm run test:contracts
git diff --check
```

El smoke test contra el backend se ejecuta con
`$env:GODT_RUN_REAL_API="1"; npm run test:contracts` y requiere el backend
disponible. No se deben usar historias clínicas reales.

## Matriz funcional

| Capacidad | Estado | Contrato backend |
|---|---|---|
| Expedientes y donantes | Implementado | `GET/POST/PATCH /api/v1/donors` |
| Documentos privados | Implementado | `GET/POST /api/v1/donors/:donorId/documents`, descarga autenticada |
| OCR y validación humana | Implementado según contrato | `/api/v1/documents/:id/ocr`, `/api/v1/ocr/jobs/:id`, `/api/v1/ocr/fields/:id/validation` |
| Catálogo e instancias | Implementado | `/api/v1/document-catalog`, `/api/v1/document-instances` |
| Revisiones y conflictos | Implementado | `GET /document-instances/:id`, `POST .../conflicts/resolve` |
| Legalización | Parcial, endpoint único | `POST /api/v1/donors/:donorId/legalization` |
| Aprobación formal, PDF, PDF/A y firma | No disponible | No existen endpoints en la rama auditada |
| Reportes e indicadores agregados | No disponible | No existen endpoints en la rama auditada |
| Usuarios, roles, IPS y auditoría consultable | No disponible | No existen endpoints de consulta en la rama auditada |

El dashboard muestra como indicador real únicamente el total paginado de
`GET /donors`; no calcula datos clínicos ni métricas ficticias en el navegador.

Las definiciones autorizadas del catálogo se guardan opcionalmente en
IndexedDB para consulta sin conexión; no se almacenan allí donantes,
instancias, respuestas clínicas ni documentos privados. En producción se
registra un service worker limitado a recursos estáticos, nunca a respuestas
de API.

## Matriz Figma vs implementación

| Pantalla/concepto | Implementación |
|---|---|
| Sidebar institucional y header | `AppLayout.vue`, responsive |
| Dashboard y estado operativo | `DashboardView.vue`, datos reales de expedientes |
| Expedientes/donantes | Listado, filtros, paginación, alta y edición |
| Documentación clínica | Carga, listado, detalle, descarga y estados vacíos |
| OCR | Procesamiento, campos y validación humana |
| Catálogo y formularios | JSON Schema, arrays, errores por ruta y revisiones |
| Centro de revisión | Historial append-only, comparación, proveniencia y conflictos |
| Legalización | Flujo Anexo 2/3 soportado por backend |
| Formalización | Validación técnica y etapas futuras explícitamente bloqueadas |
| Reportes | No se presenta pantalla operativa sin endpoint real |

## Seguridad y limitaciones

- Todas las llamadas API usan JWT centralizado; las respuestas `401` limpian la
  sesión y redirigen a `/acceso`.
- La autorización por rol e IPS permanece en el backend; ocultar enlaces no la
  sustituye.
- Los documentos se descargan mediante Blob autenticado y las URLs temporales
  se revocan.
- No se guardan datos clínicos en `localStorage` ni se registran en consola.
- El backend no ofrece consulta de auditoría, administración de usuarios/IPS ni
  reportes; esas capacidades se muestran como no disponibles.

## Guion de demostración MVP

1. Configurar un JWT sintético autorizado en `/acceso`.
2. Consultar expedientes y abrir un expediente sintético.
3. Cargar un PDF/PNG/JPEG sintético menor de 10 MiB.
4. Consultar el documento, descargarlo y comenzar OCR si el servicio está activo.
5. Revisar y validar campos OCR.
6. Crear una instancia desde una versión publicada, guardar y validar.
7. Consultar revisiones, proveniencia y conflictos.
8. Ejecutar legalización solo con un rol permitido y datos sintéticos.
9. Mostrar la pantalla de formalización para distinguir validación técnica de
   aprobación, generación y firma no disponibles.

## Defectos o dependencias pendientes

- Las pruebas contra API real requieren PostgreSQL, Redis y backend levantados.
- El backend vigente no tiene reportes, métricas agregadas, aprobación formal,
  generación PDF/PDF-A, firma electrónica ni consulta de auditoría.
- La fidelidad visual final debe revisarse con el archivo Figma y resoluciones
  institucionales definitivas; los componentes existentes mantienen la paleta,
  tipografía, espaciado y responsive del diseño auditado.