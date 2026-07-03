# ─── STAGE 1: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install build dependencies (required for compiling/generating clients)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the backend source files
COPY . .

# Generate the Prisma client files
RUN npx prisma generate

# Compile TypeScript to JavaScript (creates /app/dist)
RUN npm run build

# ─── STAGE 2: Run ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install production runtime dependencies (OpenSSL 3.0/1.1 compatibility)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Install the Prisma CLI globally in the runner stage so we can run migrations at startup
RUN npm install -g prisma@5.22.0

# Generate Prisma Client specifically for the production node_modules
RUN prisma generate

# Expose API port
EXPOSE 5000

# Startup script to run migrations and start the Express server
CMD ["sh", "-c", "prisma migrate deploy && node dist/index.js"]
