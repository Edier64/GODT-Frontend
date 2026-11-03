# Sprint 07 — Almacenamiento y caché

## Backend

`FileStoragePort` continúa siendo la frontera de infraestructura. El proveedor
se selecciona con `STORAGE_PROVIDER=local` o `STORAGE_PROVIDER=r2`.

- `local`: `LocalPrivateStorageAdapter`, fuera de las carpetas públicas.
- `r2`: `R2StorageAdapter`, compatible con el API S3 privado de Cloudflare R2.

R2 solo se inicializa cuando está seleccionado y exige sus variables completas.
La ejecución local no requiere credenciales R2.

## Frontend

`templateCache` usa IndexedDB (`godt-template-cache`, versión 1) y almacena
únicamente catálogo, schemas, UI schema, versiones, hash de definición y
marcas de verificación. No almacena instancias, donantes, respuestas clínicas
ni documentos privados.

Si la API no está disponible, el catálogo puede consultarse desde la caché
previamente autorizada, pero la caché no constituye autorización vigente. Al
cerrar sesión se solicita su limpieza. No se implementa sincronización offline
ni escritura clínica offline.

El service worker de producción solo cachea recursos estáticos (scripts,
estilos, imágenes y fuentes). No intercepta `/api` ni descargas privadas.

## Configuración futura

Para Render se debe configurar `VITE_API_BASE_URL`, CORS y las variables del
backend. Para R2 se deben configurar `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `R2_ENDPOINT` exclusivamente en backend.
