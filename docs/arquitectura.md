# Arquitectura del Frontend — GODT Regional 3

Este repositorio implementa la presentación web del sistema GODT. La arquitectura completa del producto, los diagramas Mermaid de contexto y contenedores y los ADR compartidos se mantienen en un único documento canónico del repositorio backend para evitar versiones divergentes:

- [Arquitectura global, contexto y contenedores](https://github.com/Edier64/GODT-B/blob/main/docs/arquitectura.md)
- [ADR-001 — Lenguaje y frameworks](https://github.com/Edier64/GODT-B/blob/main/docs/adr/ADR-001-stack.md)
- [ADR-002 — PostgreSQL y despliegue Azure](https://github.com/Edier64/GODT-B/blob/main/docs/adr/ADR-002-datos-y-despliegue.md)

## Contenedor frontend

- **Aplicación:** Vue 3 Composition API + TypeScript.
- **Estado:** Pinia.
- **Navegación:** Vue Router.
- **HTTP:** Axios; consume la API del backend mediante la ruta relativa /api/v1.
- **Build:** Vite y vue-tsc.
- **Estilos:** Tailwind CSS v4.
- **Ejecución local:** servidor de desarrollo Vite.
- **Imagen de producción:** build estático con Node 22 Alpine y serving/proxy con Nginx 1.27 Alpine.

## Comunicación con el backend

En desarrollo, Vite reenvía /api y /health al backend configurado en VITE_API_PROXY_TARGET. En el despliegue, Nginx sirve el bundle y reenvía /api/v1 al FQDN interno de la API NestJS. El navegador no se conecta directamente a PostgreSQL, Azure Blob Storage ni al proveedor OCR.

La configuración pública VITE_API_BASE_URL no debe contener secretos. Las credenciales de proveedores externos permanecen en el backend.
