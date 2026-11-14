# Sprint 07 — Integración

El frontend usa Axios centralizado y los servicios del motor documental. No
consume OCR pendiente o rechazado, no guarda respuestas clínicas en
`localStorage` y conserva la procedencia entregada por el backend.

El flujo catálogo → versión publicada → instancia → revisión → validación está
implementado contra contratos reales. La comprobación HTTP E2E requiere
PostgreSQL, Redis, backend y un JWT institucional sintético disponibles.
