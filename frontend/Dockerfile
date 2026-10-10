# syntax=docker/dockerfile:1

# ---- build the SPA ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the install scripts only matter for the test tooling (`canvas` compiles a native module that has
# no prebuilt binary for Alpine/musl and needs a compiler); the production build needs none of them.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ---- serve it (unprivileged nginx on :8080) and reverse-proxy the API ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
