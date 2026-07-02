import winston from 'winston';
import path from 'path';
import { getRequestContext } from './requestContext';

// ─── Log Directory ────────────────────────────────────────────────────────────
// Resolve relative to project root (two levels up from src/utils/)
const LOG_DIR = path.resolve(__dirname, '../../logs');

const isProd = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// ─── requestId Injector Format ────────────────────────────────────────────────
// Runs on every log entry and pulls requestId/userId from AsyncLocalStorage
// so all log lines within a request share the same correlation ID automatically.
const requestContextFormat = winston.format((info) => {
    const ctx = getRequestContext();
    if (ctx.requestId) info.requestId = ctx.requestId;
    if (ctx.userId)    info.userId    = ctx.userId;
    return info;
});

// ─── Dev Console Format ───────────────────────────────────────────────────────
// Human-readable, colorized output for local development.
const devConsoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const rid   = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp}${rid} ${level}: ${message}${extra}`;
    }),
);

// ─── JSON Format (production + file transports) ───────────────────────────────
const jsonFormat = winston.format.combine(
    requestContextFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

// ─── Transports ───────────────────────────────────────────────────────────────
const transports: winston.transport[] = [];

// Console transport — always active
transports.push(
    new winston.transports.Console({
        format: isProd
            ? jsonFormat           // JSON to stdout in prod (PM2 captures it)
            : devConsoleFormat,   // Pretty in dev
    })
);

// File transports — always active (queryable with `jq`)
// Combined log: all levels ≥ LOG_LEVEL
transports.push(
    new winston.transports.File({
        filename: path.join(LOG_DIR, 'app.log'),
        format:   jsonFormat,
        maxsize:  10 * 1024 * 1024, // 10 MB per file
        maxFiles: 5,                // Keep up to 5 rotated files (50 MB total)
        tailable: true,
    })
);

// Error-only log: easier to grep critical issues
transports.push(
    new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level:    'error',
        format:   jsonFormat,
        maxsize:  10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
    })
);

// ─── Logger Instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
    level:      LOG_LEVEL,
    levels:     { ...winston.config.npm.levels, http: 5 }, // add 'http' between debug and verbose
    transports,
    // Prevent Winston from exiting on uncaught exceptions handled elsewhere
    exitOnError: false,
});

// ─── Uncaught Exception / Rejection Handlers ─────────────────────────────────
// These write to error.log AND console before process.exit() is called by Node.
logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log'), format: jsonFormat })
);
logger.rejections.handle(
    new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log'), format: jsonFormat })
);
