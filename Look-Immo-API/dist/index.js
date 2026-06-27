"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = __importDefault(require("http"));
const routes_1 = __importDefault(require("./routes"));
const seo_1 = __importDefault(require("./routes/seo"));
const seoInjector_1 = require("./middleware/seoInjector");
const rateLimiter_1 = require("./middleware/rateLimiter");
const redis_1 = require("./utils/redis");
const socket_1 = require("./utils/socket");
const prisma_1 = require("./utils/prisma");
// Load environment variables
dotenv_1.default.config();
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
    console.warn('⚠️  WARNING: FRONTEND_URL is not set. CORS will default to localhost:3000 which will break production!');
}
// ─── App Setup ────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Trust proxy (essential for rate limiting behind Nginx/VPS)
app.set('trust proxy', 1);
// CORS — must come before other middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Parse cookies (HTTP-only JWT cookies)
app.use((0, cookie_parser_1.default)());
// Base security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow loading images cross-origin
}));
// Body parsers (Limited to 30mb to prevent DoS)
app.use(express_1.default.json({ limit: '30mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '30mb' }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Apply global rate limiting to all /api routes
app.use('/api', rateLimiter_1.globalLimiter);
// Debug logger (Disabled in production)
if (!isProd) {
    app.use((req, res, next) => {
        console.log(`[DEBUG] ${req.method} ${req.url}`);
        const originalSend = res.json;
        res.json = function (body) {
            // Redact sensitive fields from debug logs
            const safe = body && typeof body === 'object'
                ? JSON.stringify(body, (key, val) => ['password', 'access_token', 'refresh_token'].includes(key) ? '[REDACTED]' : val).slice(0, 150)
                : body;
            console.log(`[DEBUG] Response ${res.statusCode} for ${req.method} ${req.url}:`, safe);
            return originalSend.call(this, body);
        };
        next();
    });
}
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
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ─── Error Handler ────────────────────────────────────────────────────────────
// In production: log full error server-side but return generic message to client
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack || err.message);
    const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
    res.status(500).json({ error: message });
});
// ─── Server Startup ───────────────────────────────────────────────────────────
const server = http_1.default.createServer(app);
(0, socket_1.initSocket)(server);
(0, redis_1.connectRedis)();
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏠 Look Immo Backend Server — ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}   ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   API Base URL:      http://localhost:${PORT}/api          ║
║   WebSockets:        Enabled                               ║
║   Sitemap:           http://localhost:${PORT}/sitemap.xml  ║
║   Health Check:      http://localhost:${PORT}/health       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`\n[${signal}] Graceful shutdown initiated...`);
    server.close(async () => {
        try {
            await prisma_1.prisma.$disconnect();
            console.log('✅ Database connections closed.');
        }
        catch (e) {
            console.error('Error disconnecting Prisma:', e);
        }
        console.log('✅ HTTP server closed. Goodbye!\n');
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