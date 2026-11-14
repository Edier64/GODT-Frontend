# Sprint 05 — Integración frontend/backend

## Contratos usados

El frontend usa únicamente rutas verificadas en la rama
`Feature/Legalizacion`: donantes, documentos privados, OCR, catálogo,
instancias, revisiones/conflictos y legalización.

La integración OCR fue ajustada para consumir:

```json
{
  "jobId": "uuid",
  "sourceDocumentId": "uuid",
  "status": "EN_COLA | COMPLETADO | FALLIDO",
  "errorCode": null,
  "fields": []
}
```

## Flujos

| Flujo | Estado en esta sesión | Evidencia |
|---|---|---|
| Donantes | Parcial | Contratos y type-check; API no disponible |
| Documentos | Parcial | Contratos y servicios; API no disponible |
| OCR | Parcial | Contrato corregido y pruebas unitarias/contractuales |
| Catálogo e instancias | Parcial | Servicios y formularios; API no disponible |
| Revisión/conflictos | Parcial | Vistas y contratos; API no disponible |
| Legalización | Parcial | Endpoint y permisos verificados; API no disponible |

No se declaran flujos E2E reales completados sin PostgreSQL, Redis, backend y
JWT institucional disponibles.

## Sprint 06

El frontend consume el contrato OCR corregido con estado y código de error,
realiza polling solo mientras el backend devuelve `EN_COLA`, detiene el
temporizador al desmontar la vista y muestra la validación humana separada de
la extracción. La disponibilidad de PDF/Tesseract depende de la configuración
del backend documentada en `SPRINT_06_OCR_DOCUMENT_FLOW.md`.
