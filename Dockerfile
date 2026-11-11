# =============================================================================
# GODT Regional 3 — Frontend Dockerfile (godt-gateway: Vue 3 + Nginx)
# Multi-stage: Node compila assets estáticos, Nginx los sirve y proxea /api/v1.
# =============================================================================

# ----------- Etapa 1: Build Vue -----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
# URL relativa por defecto para mantener mismo origen detrás de Nginx / ACA
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_TITLE="GODT Regional 3"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_ENVIRONMENT=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT

RUN npm run build

# ----------- Etapa 2: Nginx Gateway -----------
FROM nginx:1.27-alpine AS production

RUN rm -f /etc/nginx/conf.d/default.conf

# Plantilla procesada automáticamente al arranque por nginx:alpine envsubst
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template

# Valores por defecto para Docker Compose local (sobrescribir en Azure Container Apps)
ENV API_UPSTREAM=http://godt-api:3000
ENV API_HOST_HEADER='$http_host'
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER='^(API_UPSTREAM|API_HOST_HEADER|NGINX_LOCAL_RESOLVERS)$'

COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
