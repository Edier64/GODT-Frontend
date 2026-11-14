# Sprint 07 — Formularios dinámicos

`DynamicField.vue` renderiza el esquema publicado sin formularios por
documento. Soporta objetos anidados, arreglos, enumeraciones, formatos,
restricciones básicas y tablas repetibles.

Una tabla se declara en `uiSchema.fieldConfigs`:

```json
{
  "$.custody": {
    "component": "table",
    "columns": [{ "key": "handler", "label": "Custodio" }]
  }
}
```

La estructura de cada columna sigue siendo la definida en
`jsonSchema.items.properties`. La validación backend continúa siendo la
autoridad.
