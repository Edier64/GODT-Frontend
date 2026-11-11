# =============================================================================
# GODT Regional 3 — Frontend Dockerfile (Vue 3 + Vite → Nginx)
# Multi-stage: Node compila, Nginx sirve estáticos + configuración SPA.
# =============================================================================

# ----------- Etapa 1: Build Vue -----------
FROM node:22-alpine AS builder
WORKDIR /app

# Dependencias reproducibles
COPY package*.json ./
RUN npm ci

# Código fuente + build (Vite genera ./dist)
COPY . ./
# VITE_API_BASE_URL en producción debe ser '/api/v1' (URL relativa)
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_TITLE="GODT Regional 3"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_ENVIRONMENT=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT

RUN npm run build

# ----------- Etapa 2: Nginx (único servidor web) -----------
FROM nginx:1.27-alpine AS production

# Eliminar configuración default de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados de Vue
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
