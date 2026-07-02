import dotenv from 'dotenv';
// Load environment variables immediately before other imports to prevent hoisting race conditions
dotenv.config();

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
    });
}


import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import http from 'http';
import routes from './routes';
import seoRoutes from './routes/seo';
import { seoInjector } from './middleware/seoInjector';
import { globalLimiter } from './middleware/rateLimiter';
import { csrfGuard } from './middleware/csrfGuard';
import { requestIdMiddleware, httpLogger } from './middleware/requestLogger';
import { connectRedis } from './utils/redis';
import { initSocket } from './utils/socket';
import { prisma } from './utils/prisma';
import { initExchangeRateCron } from './services/exchangeRateService';
import { logger } from './utils/logger';

// ─── Startup Environment Validation ──────────────────────────────────────────
// Fail fast if critical env vars are missing — prevents silent misconfiguration
const isProd = process.env.NODE_ENV === 'production';
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
        console.error(`\n❌ FATAL: Missing required environment variable: ${key}`);
        console.error('   Please check your .env file and restart the server.\n');
        process.exit(1);
    }
}

if (isProd && !process.env.FRONTEND_URL) {
    logger.warn('FRONTEND_URL is not set — CORS will default to localhost:3000 which will break production!');
}

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Core Infrastructure Middleware ──────────────────────────────────────────
// requestIdMiddleware MUST come first — it seeds AsyncLocalStorage so all
// subsequent middleware and route handlers have access to requestId.
app.use(requestIdMiddleware);
app.use(httpLogger);

// Trust proxy (essential for rate limiting behind Nginx/VPS)
app.set('trust proxy', 1);

// CORS — must come before other middleware
// Allow the configured FRONTEND_URL, and common dev ports (5173 for Vite, 3000 for older setups).
// Use a dynamic origin checker so credentials and cookies are accepted by the browser.
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (like curl, server-to-server) with no origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse cookies (HTTP-only JWT cookies)
app.use(cookieParser());

// Base security headers with 1-year HSTS (HTTP Strict Transport Security)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow loading images cross-origin
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    }
}));

// Body parsers (Limited to 30mb to prevent DoS)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiting to all /api routes
app.use('/api', globalLimiter);

// Apply CSRF protection to state-mutating API endpoints
app.use('/api', csrfGuard);

// HTTP logging is handled by httpLogger (morgan → winston) registered above.
// The old console-based debug logger has been replaced by structured JSON logs.

// ─── SEO Routes (served at root — before /api) ───────────────────────────────
app.use(seoRoutes); // /sitemap.xml and /robots.txt

// SEO Page Routes (Intercepts crawler bot requests for SPA paths)
app.get('/property/:id', seoInjector);
app.get('/blog-post/:id', seoInjector);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test error route for Sentry verification
app.get('/api/test-error', (req, res) => {
    throw new Error('Test Sentry Backend Error Spike');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Sentry Error Handler (must be registered before custom error handlers and after routes)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// ─── Error Handler ────────────────────────────────────────────────────────────
// In production: log full error server-side but return generic message to client
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
    const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
    res.status(500).json({ error: message });
});

// ─── Server Startup ───────────────────────────────────────────────────────────
const server = http.createServer(app);
initSocket(server);
connectRedis();
initExchangeRateCron();

server.listen(PORT, () => {
    logger.info('Server started', {
        env:        process.env.NODE_ENV || 'development',
        port:       PORT,
        apiBase:    `http://localhost:${PORT}/api`,
        health:     `http://localhost:${PORT}/health`,
        websockets: true,
    });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
    logger.info(`Graceful shutdown initiated`, { signal });
    server.close(async () => {
        try {
            await prisma.$disconnect();
            logger.info('Database connections closed.');
        } catch (e) {
            logger.error('Error disconnecting Prisma', { error: e });
        }
        logger.info('HTTP server closed.');
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
