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
FROM nginx:1.25-alpine

# Remove default static assets and configuration
RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/conf.d/default.conf

# Copy React build artifacts to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# The main proxying configuration will be copied during docker-compose run,
# or we can place a default Nginx config inside the image.
# Expose HTTP and HTTPS ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
