# ─── STAGE 1: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install build dependencies (required for OpenSSL / Prisma schema-engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition files and Prisma schema first (cache layer)
COPY package*.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (devDeps needed for tsc + prisma generate)
RUN npm ci

# Generate the Prisma Client from the schema
RUN npx prisma generate

# Copy the rest of the source
COPY . .

# Compile TypeScript → JavaScript (output: /app/dist)
RUN npm run build

# ─── STAGE 2: Run ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Runtime dependency: OpenSSL (same version as builder so Prisma engines work)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and Prisma schema (needed for migrate deploy at startup)
COPY package*.json ./
COPY prisma/ ./prisma/

# Production-only dependencies
RUN npm ci --omit=dev

# ── Key fix: copy the already-generated Prisma Client from the builder stage ──
# This avoids needing to re-run prisma generate (and avoids permission issues
# with globally-installed binaries).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# ── Startup: run pending migrations then start the server ─────────────────────
# Use npx (resolves the local prisma binary) instead of a global install.
# npx prisma migrate deploy is safe to run on every container start:
#   - It is a no-op when all migrations are already applied.
#   - It applies only new migrations, never rolls back.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
