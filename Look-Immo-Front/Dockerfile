# ─── STAGE 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy configuration and source files
COPY . .

# Set build-time variables (Vite embeds VITE_* variables in the build)
ARG VITE_API_URL=/api
ARG VITE_BACKEND_URL=""
ARG VITE_SENTRY_DSN=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build the production React assets (output to /app/dist)
RUN npm run build

# ─── STAGE 2: Production Web Server ──────────────────────────────────────────
# Previously plain nginx serving dist/ directly. Swapped for a small Node
# server (server/prerender-server.mjs) that serves the exact same static
# files for real users, but additionally detects social/search bot user
# agents on /property/:id and /blog-post/:id and injects real per-page
# title/description/OG/JSON-LD before responding — nginx alone can't do
# that without a Lua/OpenResty setup, since it can't fetch the backend API
# per-request. If this app already sits behind an nginx/CDN layer for
# TLS/caching, point it at this container instead of serving dist/ directly.
FROM node:20-alpine AS runtime
WORKDIR /app/server

# Install only the server's own (tiny) dependency set, not the frontend's
COPY server/package.json ./
RUN npm install --omit=dev

COPY server/*.mjs ./
COPY --from=builder /app/dist /app/dist

ENV PORT=8080
# Set these at deploy time — see .env.example for what each controls:
#   SITE_URL               public frontend origin, e.g. https://look-immo.tn
#   PRERENDER_API_URL      backend API origin reachable from this container
ENV DIST_DIR=/app/dist

EXPOSE 8080

CMD ["node", "prerender-server.mjs"]
