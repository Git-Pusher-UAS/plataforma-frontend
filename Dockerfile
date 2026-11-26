# syntax=docker/dockerfile:1

# --- Compilación del cliente ---
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# --- Imagen final: solo archivos estáticos, sin Node, sin privilegios ---
FROM caddy:2-alpine
ENV XDG_DATA_HOME=/tmp/caddy-data XDG_CONFIG_HOME=/tmp/caddy-config
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
