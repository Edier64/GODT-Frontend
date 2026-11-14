# Sprint 05 — Auditoría frontend

## Estado inicial

- Rama: `main`.
- Commit auditado: `a4bcd9b`.
- `origin/main` coincide con el commit local.
- No había cambios tracked pendientes al iniciar la auditoría.

## Verificaciones

- Servicios Axios centralizados para donantes, documentos, OCR, catálogo,
  instancias y legalización.
- JWT enviado por interceptor y rutas protegidas por Vue Router.
- `401` limpia sesión y redirige a `/acceso`; `403`, `404`, `409` y `422`
  muestran mensajes controlados.
- Documentos privados usan solicitudes autenticadas y Blob URLs revocadas.
- No se encontraron datos clínicos en `localStorage`, `sessionStorage` ni
  registros de consola.
- Vistas contemplan carga, vacío, error y éxito según el módulo.

## Corrección aplicada

El controlador OCR consume ahora el estado real entregado por
`GET /ocr/jobs/:jobId`; ya no mantiene indefinidamente el estado inicial
`EN_COLA` cuando el backend informa `COMPLETADO` o `FALLIDO`.
