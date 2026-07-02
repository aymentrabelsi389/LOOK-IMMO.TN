"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables immediately before other imports to prevent hoisting race conditions
dotenv_1.default.config();
const Sentry = __importStar(require("@sentry/node"));
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
    });
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = __importDefault(require("http"));
const routes_1 = __importDefault(require("./routes"));
const seo_1 = __importDefault(require("./routes/seo"));
const seoInjector_1 = require("./middleware/seoInjector");
const rateLimiter_1 = require("./middleware/rateLimiter");
const csrfGuard_1 = require("./middleware/csrfGuard");
const requestLogger_1 = require("./middleware/requestLogger");
const redis_1 = require("./utils/redis");
const socket_1 = require("./utils/socket");
const prisma_1 = require("./utils/prisma");
const exchangeRateService_1 = require("./services/exchangeRateService");
const logger_1 = require("./utils/logger");
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
    logger_1.logger.warn('FRONTEND_URL is not set — CORS will default to localhost:3000 which will break production!');
}
// ─── App Setup ────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ─── Core Infrastructure Middleware ──────────────────────────────────────────
// requestIdMiddleware MUST come first — it seeds AsyncLocalStorage so all
// subsequent middleware and route handlers have access to requestId.
app.use(requestLogger_1.requestIdMiddleware);
app.use(requestLogger_1.httpLogger);
// Trust proxy (essential for rate limiting behind Nginx/VPS)
app.set('trust proxy', 1);
// CORS — must come before other middleware
// Allow the configured FRONTEND_URL, and common dev ports (5173 for Vite, 3000 for older setups).
// Use a dynamic origin checker so credentials and cookies are accepted by the browser.
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (like curl, server-to-server) with no origin
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Parse cookies (HTTP-only JWT cookies)
app.use((0, cookie_parser_1.default)());
// Base security headers with 1-year HSTS (HTTP Strict Transport Security)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow loading images cross-origin
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    }
}));
// Body parsers (Limited to 30mb to prevent DoS)
app.use(express_1.default.json({ limit: '30mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '30mb' }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Apply global rate limiting to all /api routes
app.use('/api', rateLimiter_1.globalLimiter);
// Apply CSRF protection to state-mutating API endpoints
app.use('/api', csrfGuard_1.csrfGuard);
// HTTP logging is handled by httpLogger (morgan → winston) registered above.
// The old console-based debug logger has been replaced by structured JSON logs.
// ─── SEO Routes (served at root — before /api) ───────────────────────────────
app.use(seo_1.default); // /sitemap.xml and /robots.txt
// SEO Page Routes (Intercepts crawler bot requests for SPA paths)
app.get('/property/:id', seoInjector_1.seoInjector);
app.get('/blog-post/:id', seoInjector_1.seoInjector);
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes_1.default);
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
app.use((err, req, res, next) => {
    logger_1.logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
    const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
    res.status(500).json({ error: message });
});
// ─── Server Startup ───────────────────────────────────────────────────────────
const server = http_1.default.createServer(app);
(0, socket_1.initSocket)(server);
(0, redis_1.connectRedis)();
(0, exchangeRateService_1.initExchangeRateCron)();
server.listen(PORT, () => {
    logger_1.logger.info('Server started', {
        env: process.env.NODE_ENV || 'development',
        port: PORT,
        apiBase: `http://localhost:${PORT}/api`,
        health: `http://localhost:${PORT}/health`,
        websockets: true,
    });
});
// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger_1.logger.info(`Graceful shutdown initiated`, { signal });
    server.close(async () => {
        try {
            await prisma_1.prisma.$disconnect();
            logger_1.logger.info('Database connections closed.');
        }
        catch (e) {
            logger_1.logger.error('Error disconnecting Prisma', { error: e });
        }
        logger_1.logger.info('HTTP server closed.');
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
exports.default = app;
//# sourceMappingURL=index.js.map