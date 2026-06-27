import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import http from 'http';
import routes from './routes';
import seoRoutes from './routes/seo';
import { seoInjector } from './middleware/seoInjector';
import { globalLimiter } from './middleware/rateLimiter';
import { connectRedis } from './utils/redis';
import { initSocket } from './utils/socket';
import { prisma } from './utils/prisma';

// Load environment variables
dotenv.config();

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
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (essential for rate limiting behind Nginx/VPS)
app.set('trust proxy', 1);

// CORS — must come before other middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse cookies (HTTP-only JWT cookies)
app.use(cookieParser());

// Base security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow loading images cross-origin
}));

// Body parsers (Limited to 30mb to prevent DoS)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiting to all /api routes
app.use('/api', globalLimiter);

// Debug logger (Disabled in production)
if (!isProd) {
    app.use((req, res, next) => {
        console.log(`[DEBUG] ${req.method} ${req.url}`);
        const originalSend = res.json;
        res.json = function (body) {
            // Redact sensitive fields from debug logs
            const safe = body && typeof body === 'object'
                ? JSON.stringify(body, (key, val) =>
                    ['password', 'access_token', 'refresh_token'].includes(key) ? '[REDACTED]' : val
                ).slice(0, 150)
                : body;
            console.log(`[DEBUG] Response ${res.statusCode} for ${req.method} ${req.url}:`, safe);
            return originalSend.call(this, body);
        };
        next();
    });
}

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

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
// In production: log full error server-side but return generic message to client
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[ERROR]', err.stack || err.message);
    const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
    res.status(500).json({ error: message });
});

// ─── Server Startup ───────────────────────────────────────────────────────────
const server = http.createServer(app);
initSocket(server);
connectRedis();

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
const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Graceful shutdown initiated...`);
    server.close(async () => {
        try {
            await prisma.$disconnect();
            console.log('✅ Database connections closed.');
        } catch (e) {
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

export default app;
