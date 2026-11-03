# Sprint 05 — Resultados de pruebas frontend

| Comando | Resultado |
|---|---|
| `npm exec vue-tsc -- --noEmit` | Correcto |
| `npm run build` | Correcto |
| `npm run test:contracts` | 4 correctas, 1 smoke test real omitido |
| `git diff --check` | Correcto |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |

Las pruebas contractuales cubren rutas de servicios, navegación autenticada,
expiración de sesión, Blob URLs y formularios dinámicos. El smoke test real
requiere `GODT_RUN_REAL_API=1` y un backend disponible.
